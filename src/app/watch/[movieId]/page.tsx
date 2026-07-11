"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { seedMovie, seedProfiles } from "@/lib/data/seed";
import { GenerationJob, PlaybackManifest, PlaybackSegment } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default function WatchMoviePage() {
  const params = useParams();
  const movieId = paramsValue(params.movieId);
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profile");

  const movie = seedMovie;
  const profile = seedProfiles.find((candidate) => candidate.id === profileId) || seedProfiles[0];

  const videoRef = useRef<HTMLVideoElement>(null);
  const preloadVideoRef = useRef<HTMLVideoElement>(null);
  const currentSegmentIndexRef = useRef(0);
  const segmentsRef = useRef<PlaybackSegment[]>([]);

  const [manifest, setManifest] = useState<PlaybackManifest | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [timelineTime, setTimelineTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const segments = useMemo(() => manifest?.segments || [], [manifest]);
  const currentSegment = segments[currentSegmentIndex];

  useEffect(() => {
    currentSegmentIndexRef.current = currentSegmentIndex;
  }, [currentSegmentIndex]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

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

      const freezeThroughIndex = currentSegmentIndexRef.current + 1;
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
        setTimelineTime(0);
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

  useEffect(() => {
    const nextSegment = segments[currentSegmentIndex + 1];
    const preloadVideo = preloadVideoRef.current;
    if (!nextSegment || !preloadVideo) return;

    if (preloadVideo.getAttribute("src") !== nextSegment.assetUrl) {
      preloadVideo.src = nextSegment.assetUrl;
      preloadVideo.load();
    }
  }, [currentSegmentIndex, segments]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSegment) return;

    let cancelled = false;

    const loadSegment = async () => {
      const srcChanged = video.getAttribute("src") !== currentSegment.assetUrl;
      if (srcChanged) {
        video.src = currentSegment.assetUrl;
        video.load();
        await waitForMetadata(video);
        if (cancelled) return;
        video.currentTime = currentSegment.assetStartSeconds;
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
  }, [currentSegment, isPlaying]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    const segment = segmentsRef.current[currentSegmentIndexRef.current];
    if (!video || !segment) return;

    const elapsed = Math.max(0, video.currentTime - segment.assetStartSeconds);
    const nextTimelineTime = Math.min(segment.timelineEndSeconds, segment.timelineStartSeconds + elapsed);
    setTimelineTime(nextTimelineTime);

    const expectedEnd = segment.assetStartSeconds + segment.expectedDurationSeconds;
    const shouldAdvance =
      segment.source === "CANONICAL_FULL"
        ? video.currentTime >= segment.timelineEndSeconds
        : video.currentTime >= expectedEnd || video.ended;

    if (shouldAdvance) {
      handleEnded();
    }
  };

  const handleEnded = () => {
    const currentSegments = segmentsRef.current;
    const index = currentSegmentIndexRef.current;

    if (index < currentSegments.length - 1) {
      const nextIndex = index + 1;
      setCurrentSegmentIndex(nextIndex);
      setTimelineTime(currentSegments[nextIndex].timelineStartSeconds);
    } else {
      setIsPlaying(false);
      setCurrentSegmentIndex(0);
      setTimelineTime(0);
    }
  };

  if (!profile) return <div>Profile not found</div>;

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/watch" className="text-indigo-400 hover:text-indigo-300 text-sm mb-2 inline-block">
            &larr; Back to Profiles
          </Link>
          <h1 className="text-3xl font-bold">{movie.title}</h1>
          <p className="text-slate-400 mt-1">
            Personalized for <strong className="text-slate-200">{profile.displayName}</strong> ({profile.city}, {profile.languageLabel})
          </p>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
        <div className="aspect-video bg-black flex flex-col items-center justify-center relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            controls={false}
            playsInline
          />
          <video ref={preloadVideoRef} className="hidden" preload="auto" muted playsInline />

          <div className="absolute top-4 left-4 p-2 bg-black/60 rounded text-xs font-mono text-white/50 pointer-events-none">
            Segment: {currentSegment?.source || "LOADING"} ({segments.length ? currentSegmentIndex + 1 : 0}/{segments.length})
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
              disabled={!currentSegment}
            >
              {isPlaying ? "||" : "▶"}
            </button>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full relative overflow-hidden">
              <div
                className="absolute top-0 left-0 bottom-0 bg-[#E50914] transition-all duration-300"
                style={{ width: `${(timelineTime / movie.durationSeconds) * 100}%` }}
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
            {segments.filter((segment) => segment.type === "ADAPTIVE").map((segment) => {
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
