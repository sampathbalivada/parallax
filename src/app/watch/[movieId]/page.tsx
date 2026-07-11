"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { seedMovies, seedProfiles } from "@/lib/data/seed";
import { GenerationJob, PlaybackManifest, PlaybackSegment } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CustomProfileForm } from "./custom-profile-form";

type PrepareResponse = {
  success: boolean;
  manifest?: PlaybackManifest;
  error?: string;
};

function paramsValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function waitForMetadata(video: HTMLVideoElement) {
  if (video.readyState >= 1) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("error", handleError);
    };
    const handleMetadata = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Video metadata failed to load"));
    };

    video.addEventListener("loadedmetadata", handleMetadata, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

function mergeFrozenSegments(
  currentSegments: PlaybackSegment[],
  nextSegments: PlaybackSegment[],
  freezeThroughIndex: number,
) {
  if (currentSegments.length === 0) return nextSegments;

  return nextSegments.map((segment, index) => {
    const current = currentSegments[index];
    if (index <= freezeThroughIndex && current?.id === segment.id) {
      return current;
    }
    return segment;
  });
}

type PlaybackMode = "MSE" | "DUAL_VIDEO_FALLBACK" | "MSE_ERROR";

const MSE_ROLLING_AHEAD_SEGMENTS = 2;

export default function WatchMoviePage() {
  const params = useParams();
  const movieId = paramsValue(params.movieId);
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profile");

  const movie = seedMovies.find((candidate) => candidate.id === movieId);
  const activeMovie = movie || seedMovies[0];
  const profile = seedProfiles.find((candidate) => candidate.id === profileId);
  const activeProfile = profile || seedProfiles[0];

  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);
  const mseVideoRef = useRef<HTMLVideoElement>(null);
  const currentSegmentIndexRef = useRef(0);
  const activePlayerIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const segmentsRef = useRef<PlaybackSegment[]>([]);
  const playbackModeRef = useRef<PlaybackMode>("MSE");
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const mseObjectUrlRef = useRef<string | null>(null);
  const mseAppendQueueRef = useRef<number[]>([]);
  const mseQueuedKeysRef = useRef<Set<string>>(new Set());
  const mseAppendedKeysRef = useRef<Set<string>>(new Set());
  const mseAppendingRef = useRef(false);
  const highestQueuedSegmentIndexRef = useRef(-1);
  const highestAppendedSegmentIndexRef = useRef(-1);

  const [manifest, setManifest] = useState<PlaybackManifest | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [timelineTime, setTimelineTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("MSE");
  const [mseReady, setMseReady] = useState(false);

  const segments = useMemo(() => manifest?.segments || [], [manifest]);
  const currentSegment = segments[currentSegmentIndex];
  const displaySegments = segments;
  const displayCurrentSegment = currentSegment;
  const displayTimelineTime = timelineTime;
  const displayIsPlaying = isPlaying;
  const videoRefs = useMemo(() => [primaryVideoRef, secondaryVideoRef], []);
  const firstMseMimeType = segments[0]?.mimeType;

  const videoForIndex = useCallback((index: number) => videoRefs[index].current, [videoRefs]);
  const mseSegmentKey = useCallback((segment: PlaybackSegment) => `${segment.id}:${segment.mseAssetUrl}`, []);

  const switchToDualVideoFallback = useCallback((nextMode: PlaybackMode, reason: unknown) => {
    setError(String(reason));
    playbackModeRef.current = nextMode;
    setPlaybackMode(nextMode);
    setMseReady(false);
    const mseVideo = mseVideoRef.current;
    if (mseVideo) mseVideo.pause();
  }, []);

  useEffect(() => {
    currentSegmentIndexRef.current = currentSegmentIndex;
  }, [currentSegmentIndex]);

  useEffect(() => {
    activePlayerIndexRef.current = activePlayerIndex;
  }, [activePlayerIndex]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  const fetchManifest = useCallback(async (mode: "replace" | "merge-future") => {
    if (!movieId) return;

    const params = new URLSearchParams({ movieId });
    if (profileId) params.set("profileId", profileId);

    const response = await fetch(`/api/cuts/prepare?${params.toString()}`);
    const data = (await response.json()) as PrepareResponse;

    if (!data.success || !data.manifest) {
      throw new Error(data.error || "Failed to prepare playback manifest");
    }

    setManifest((current) => {
      if (!current || mode === "replace") return data.manifest!;

      const freezeThroughIndex =
        playbackModeRef.current === "MSE"
          ? Math.max(currentSegmentIndexRef.current + 1, highestQueuedSegmentIndexRef.current)
          : currentSegmentIndexRef.current + 1;
      return {
        ...data.manifest!,
        segments: mergeFrozenSegments(current.segments, data.manifest!.segments, freezeThroughIndex),
      };
    });
  }, [movieId, profileId]);

  useEffect(() => {
    fetchManifest("replace")
      .then(() => {
        setError(null);
        setCurrentSegmentIndex(0);
        setActivePlayerIndex(0);
        setTimelineTime(0);
        setPlaybackMode("MSE");
        playbackModeRef.current = "MSE";
      })
      .catch((err) => setError(String(err)));

    if (profileId) {
      fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId, profileId }),
      }).catch(console.error);
    }
  }, [fetchManifest, movieId, profileId]);

  useEffect(() => {
    if (!profileId) return;

    const interval = setInterval(() => {
      fetch(`/api/jobs?movieId=${movieId}&profileId=${profileId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.jobs) {
            setJobs(data.jobs);
            return fetchManifest("merge-future");
          }
        })
        .catch((err) => setError(String(err)));
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchManifest, movieId, profileId]);

  const processMseAppendQueue = useCallback(async () => {
    if (mseAppendingRef.current) return;

    const sourceBuffer = sourceBufferRef.current;
    const mediaSource = mediaSourceRef.current;
    if (!sourceBuffer || !mediaSource || sourceBuffer.updating) return;

    mseAppendingRef.current = true;

    try {
      while (mseAppendQueueRef.current.length > 0) {
        const nextIndex = mseAppendQueueRef.current.shift();
        if (nextIndex === undefined) break;

        const segment = segmentsRef.current[nextIndex];
        if (!segment) continue;

        const response = await fetch(segment.mseAssetUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch MSE segment ${segment.mseAssetUrl}: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            sourceBuffer.removeEventListener("updateend", handleUpdateEnd);
            sourceBuffer.removeEventListener("error", handleError);
          };
          const handleUpdateEnd = () => {
            cleanup();
            resolve();
          };
          const handleError = () => {
            cleanup();
            reject(new Error(`MSE append failed for ${segment.mseAssetUrl}`));
          };

          sourceBuffer.addEventListener("updateend", handleUpdateEnd, { once: true });
          sourceBuffer.addEventListener("error", handleError, { once: true });
          sourceBuffer.appendBuffer(buffer);
        });

        mseAppendedKeysRef.current.add(mseSegmentKey(segment));
        highestAppendedSegmentIndexRef.current = Math.max(highestAppendedSegmentIndexRef.current, nextIndex);

        if (nextIndex === segmentsRef.current.length - 1 && mediaSource.readyState === "open" && !sourceBuffer.updating) {
          mediaSource.endOfStream();
        }
      }
    } catch (err) {
      switchToDualVideoFallback("MSE_ERROR", err);
      return;
    } finally {
      mseAppendingRef.current = false;
    }
  }, [mseSegmentKey, switchToDualVideoFallback]);

  const queueMseSegmentsThrough = useCallback((targetIndex: number) => {
    const currentSegments = segmentsRef.current;
    const cappedTargetIndex = Math.min(targetIndex, currentSegments.length - 1);

    for (let index = 0; index <= cappedTargetIndex; index++) {
      const segment = currentSegments[index];
      if (!segment) continue;

      const key = mseSegmentKey(segment);
      if (mseQueuedKeysRef.current.has(key) || mseAppendedKeysRef.current.has(key)) continue;

      mseQueuedKeysRef.current.add(key);
      mseAppendQueueRef.current.push(index);
      highestQueuedSegmentIndexRef.current = Math.max(highestQueuedSegmentIndexRef.current, index);
    }

    void processMseAppendQueue();
  }, [mseSegmentKey, processMseAppendQueue]);

  useEffect(() => {
    const video = mseVideoRef.current;
    if (!firstMseMimeType || !video) return;

    if (!("MediaSource" in window) || !MediaSource.isTypeSupported(firstMseMimeType)) {
      queueMicrotask(() => switchToDualVideoFallback("DUAL_VIDEO_FALLBACK", `MSE unsupported: ${firstMseMimeType}`));
      return;
    }

    const mediaSource = new MediaSource();
    const objectUrl = URL.createObjectURL(mediaSource);
    mediaSourceRef.current = mediaSource;
    mseObjectUrlRef.current = objectUrl;
    sourceBufferRef.current = null;
    mseAppendQueueRef.current = [];
    mseQueuedKeysRef.current = new Set();
    mseAppendedKeysRef.current = new Set();
    mseAppendingRef.current = false;
    highestQueuedSegmentIndexRef.current = -1;
    highestAppendedSegmentIndexRef.current = -1;

    video.src = objectUrl;

    const handleSourceOpen = () => {
      try {
        const sourceBuffer = mediaSource.addSourceBuffer(firstMseMimeType);
        sourceBuffer.mode = "sequence";
        sourceBufferRef.current = sourceBuffer;
        setMseReady(true);
        queueMseSegmentsThrough(MSE_ROLLING_AHEAD_SEGMENTS);
      } catch (err) {
        switchToDualVideoFallback("MSE_ERROR", err);
      }
    };

    mediaSource.addEventListener("sourceopen", handleSourceOpen, { once: true });

    return () => {
      mediaSource.removeEventListener("sourceopen", handleSourceOpen);
      setMseReady(false);
      sourceBufferRef.current = null;
      mediaSourceRef.current = null;
      mseAppendQueueRef.current = [];
      mseQueuedKeysRef.current = new Set();
      mseAppendedKeysRef.current = new Set();
      mseAppendingRef.current = false;
      if (mseObjectUrlRef.current) {
        URL.revokeObjectURL(mseObjectUrlRef.current);
        mseObjectUrlRef.current = null;
      }
    };
  }, [firstMseMimeType, queueMseSegmentsThrough, switchToDualVideoFallback]);

  useEffect(() => {
    if (playbackMode !== "MSE" || !mseReady) return;
    queueMseSegmentsThrough(currentSegmentIndex + MSE_ROLLING_AHEAD_SEGMENTS);
  }, [currentSegmentIndex, mseReady, playbackMode, queueMseSegmentsThrough, segments]);

  useEffect(() => {
    if (playbackMode !== "MSE") return;
    if (!mseReady) return;

    const video = mseVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch((err) => switchToDualVideoFallback("MSE_ERROR", err));
    } else {
      video.pause();
    }
  }, [isPlaying, mseReady, playbackMode, switchToDualVideoFallback]);

  const handleMseTimeUpdate = () => {
    const video = mseVideoRef.current;
    const currentSegments = segmentsRef.current;
    if (!video || currentSegments.length === 0) return;

    const nextTimelineTime = Math.min(activeMovie.durationSeconds, Math.max(0, video.currentTime));
    setTimelineTime(nextTimelineTime);

    const nextSegmentIndex = currentSegments.findIndex((segment) => nextTimelineTime < segment.timelineEndSeconds);
    const resolvedSegmentIndex = nextSegmentIndex === -1 ? currentSegments.length - 1 : nextSegmentIndex;
    if (resolvedSegmentIndex !== currentSegmentIndexRef.current) {
      currentSegmentIndexRef.current = resolvedSegmentIndex;
      setCurrentSegmentIndex(resolvedSegmentIndex);
    }
  };

  const handleMseEnded = () => {
    const video = mseVideoRef.current;
    if (video) video.currentTime = 0;
    setIsPlaying(false);
    setCurrentSegmentIndex(0);
    currentSegmentIndexRef.current = 0;
    setTimelineTime(0);
  };

  useEffect(() => {
    if (playbackMode === "MSE") return;

    const nextSegment = segments[currentSegmentIndex + 1];
    const standbyVideo = videoForIndex(1 - activePlayerIndex);
    if (!nextSegment || !standbyVideo) return;

    standbyVideo.pause();
    standbyVideo.currentTime = 0;

    if (standbyVideo.getAttribute("src") !== nextSegment.assetUrl) {
      standbyVideo.src = nextSegment.assetUrl;
      standbyVideo.load();
    }
  }, [activePlayerIndex, currentSegmentIndex, playbackMode, segments, videoForIndex]);

  useEffect(() => {
    if (playbackMode === "MSE") return;

    const video = videoForIndex(activePlayerIndex);
    if (!video || !currentSegment) return;

    let cancelled = false;

    const loadSegment = async () => {
      const srcChanged = video.getAttribute("src") !== currentSegment.assetUrl;
      if (srcChanged) {
        video.src = currentSegment.assetUrl;
        video.load();
        await waitForMetadata(video);
        if (cancelled) return;
        video.currentTime = 0;
      }

      if (isPlaying) {
        await video.play();
      } else {
        video.pause();
      }
    };

    loadSegment().catch((err) => setError(String(err)));

    return () => {
      cancelled = true;
    };
  }, [activePlayerIndex, currentSegment, isPlaying, playbackMode, videoForIndex]);

  const handleTimeUpdate = (playerIndex: number) => {
    if (playerIndex !== activePlayerIndexRef.current) return;
    if (playbackModeRef.current === "MSE") return;

    const video = videoForIndex(playerIndex);
    const segment = segmentsRef.current[currentSegmentIndexRef.current];
    if (!video || !segment) return;

    const elapsed = Math.max(0, video.currentTime);
    const nextTimelineTime = Math.min(segment.timelineEndSeconds, segment.timelineStartSeconds + elapsed);
    setTimelineTime(nextTimelineTime);

    const shouldAdvance = video.currentTime >= segment.expectedDurationSeconds || video.ended;

    if (shouldAdvance) {
      handleEnded(playerIndex);
    }
  };

  const handleEnded = (playerIndex: number) => {
    if (playerIndex !== activePlayerIndexRef.current) return;
    if (playbackModeRef.current === "MSE") return;

    const currentSegments = segmentsRef.current;
    const index = currentSegmentIndexRef.current;

    if (index < currentSegments.length - 1) {
      const nextIndex = index + 1;
      const currentVideo = videoForIndex(activePlayerIndexRef.current);
      const nextPlayerIndex = 1 - activePlayerIndexRef.current;
      const nextVideo = videoForIndex(nextPlayerIndex);

      currentVideo?.pause();
      if (nextVideo) {
        nextVideo.currentTime = 0;
        if (isPlayingRef.current) {
          nextVideo.play().catch((err) => setError(String(err)));
        }
      }

      activePlayerIndexRef.current = nextPlayerIndex;
      currentSegmentIndexRef.current = nextIndex;
      setActivePlayerIndex(nextPlayerIndex);
      setCurrentSegmentIndex(nextIndex);
      setTimelineTime(currentSegments[nextIndex].timelineStartSeconds);
    } else {
      setIsPlaying(false);
      setCurrentSegmentIndex(0);
      setTimelineTime(0);
    }
  };

  if (!movie) return <main className="p-8">Movie not found</main>;

  if (!profileId) {
    return (
      <main className="min-h-screen p-8 max-w-5xl mx-auto flex flex-col gap-10">
        <div className="text-center">
          <Link href="/watch" className="text-indigo-400 hover:text-indigo-300 text-sm mb-4 inline-block">
            &larr; Back to Projects
          </Link>
          <h1 className="text-4xl font-bold tracking-tight">Who is watching?</h1>
          <p className="text-slate-400 mt-2">Select a viewer profile for {movie.title}.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {seedProfiles.map((candidate) => (
            <Card key={candidate.id} className="bg-zinc-900 border-zinc-800 flex flex-col">
              <div className="p-6 flex-1">
                <div className="text-2xl font-semibold text-slate-100 flex items-center justify-between gap-3">
                  <span className="truncate">{candidate.displayName}</span>
                  <span className="text-sm text-slate-500 shrink-0">{candidate.country}</span>
                </div>
                <div className="mt-5 flex flex-col gap-2 text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">City</span>
                    <span className="font-medium text-slate-200">{candidate.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">Language</span>
                    <span className="font-medium text-slate-200">{candidate.languageLabel}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-zinc-700">{candidate.locale}</Badge>
                    {candidate.culturalContext?.map((ctx) => (
                      <Badge key={ctx} variant="secondary" className="bg-zinc-800 text-slate-400">{ctx}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 pt-0">
                <Link href={`/watch/${movie.id}?profile=${candidate.id}`} className={buttonVariants({ className: "w-full rounded" })}>
                  Watch this cut
                </Link>
              </div>
            </Card>
          ))}
        </div>

        <CustomProfileForm movieId={movie.id} />
      </main>
    );
  }

  if (!profile) return <main className="p-8">Profile not found</main>;

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/watch/${movie.id}`} className="text-indigo-400 hover:text-indigo-300 text-sm mb-2 inline-block">
            &larr; Back to Profiles
          </Link>
          <h1 className="text-3xl font-bold">{activeMovie.title}</h1>
          <p className="text-slate-400 mt-1">
            Personalized for <strong className="text-slate-200">{activeProfile.displayName}</strong> ({activeProfile.city}, {activeProfile.languageLabel})
          </p>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
        <div className="aspect-video bg-black flex flex-col items-center justify-center relative">
          <video
            ref={mseVideoRef}
            className={`absolute inset-0 w-full h-full object-cover ${playbackMode === "MSE" ? "opacity-100" : "opacity-0"}`}
            onTimeUpdate={handleMseTimeUpdate}
            onEnded={handleMseEnded}
            controls={false}
            preload="auto"
            playsInline
          />
          <video
            ref={primaryVideoRef}
            className={`absolute inset-0 w-full h-full object-cover ${playbackMode !== "MSE" && activePlayerIndex === 0 ? "opacity-100" : "opacity-0"}`}
            onTimeUpdate={() => handleTimeUpdate(0)}
            onEnded={() => handleEnded(0)}
            controls={false}
            preload="auto"
            playsInline
          />
          <video
            ref={secondaryVideoRef}
            className={`absolute inset-0 w-full h-full object-cover ${playbackMode !== "MSE" && activePlayerIndex === 1 ? "opacity-100" : "opacity-0"}`}
            onTimeUpdate={() => handleTimeUpdate(1)}
            onEnded={() => handleEnded(1)}
            controls={false}
            preload="auto"
            playsInline
          />

          <div className="absolute top-4 left-4 p-2 bg-black/60 rounded text-xs font-mono text-white/50 pointer-events-none">
            Segment: {displayCurrentSegment?.source || "LOADING"} ({displaySegments.length ? currentSegmentIndex + 1 : 0}/{displaySegments.length}) · {playbackMode}
          </div>

          {error && (
            <div className="absolute top-4 right-4 max-w-sm p-2 bg-red-950/90 border border-red-800 rounded text-xs text-red-100">
              {error}
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-4">
            <button
              className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center font-bold"
              onClick={() => setIsPlaying((value) => !value)}
              disabled={!displayCurrentSegment}
            >
              {displayIsPlaying ? "||" : "▶"}
            </button>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full relative overflow-hidden">
              <div
                className="absolute top-0 left-0 bottom-0 bg-[#E50914] transition-all duration-300"
                style={{ width: `${(displayTimelineTime / activeMovie.durationSeconds) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <CardContent className="p-4 border-t border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Segment Status</h3>
            <span className="text-xs text-slate-600">
              Manifest: {manifest ? new Date(manifest.preparedAt).toLocaleTimeString() : "Preparing"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {displaySegments.filter((segment) => segment.type === "ADAPTIVE").map((segment) => {
              const job = jobs.find((candidate) => candidate.slotId === segment.slotId);
              const statusLabel = job?.status === "READY" ? segment.status : job?.status || segment.status;

              return (
                <div key={segment.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col gap-2">
                  <div className="font-medium text-slate-200 text-sm">{segment.label || segment.id}</div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Status</span>
                    <Badge
                      variant="outline"
                      className={
                        statusLabel === "READY"
                          ? "text-green-400 border-green-900"
                          : statusLabel === "FALLBACK"
                            ? "text-amber-400 border-amber-900"
                            : statusLabel === "FAILED"
                              ? "text-red-400 border-red-900"
                              : "text-blue-400 border-blue-900 animate-pulse"
                      }
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-slate-500">Source</span>
                    <span className="text-slate-400 font-mono">
                      {segment.source === "GENERATED_CLIP" ? "Generated Asset" : "Canonical Fallback"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
