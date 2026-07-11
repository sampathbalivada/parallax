"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { seedMovie, seedSlots, seedProfiles } from "@/lib/data/seed";
import { PlaybackManifest, PlaybackSegment, ViewerProfile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { LoaderCircle } from "lucide-react";

type CutPlayerProps = {
  profile: ViewerProfile;
  playing: boolean;
  seekSeconds: number;
  seekRevision: number;
};

function CutPlayer({ profile, playing, seekSeconds, seekRevision }: CutPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const segmentsRef = useRef<PlaybackSegment[]>([]);
  const playingRef = useRef(playing);
  const seekSecondsRef = useRef(seekSeconds);
  const [manifest, setManifest] = useState<PlaybackManifest | null>(null);
  const [timelineTime, setTimelineTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const segments = useMemo(() => manifest?.segments || [], [manifest]);
  const manifestKey = useMemo(() => segments.map((segment) => segment.mseAssetUrl).join("|"), [segments]);
  const mimeType = segments[0]?.mimeType;
  const currentSegment = segments.find((segment) => timelineTime < segment.timelineEndSeconds) || segments.at(-1);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    playingRef.current = playing;
    seekSecondsRef.current = seekSeconds;
  }, [playing, seekSeconds]);

  const loadManifest = useCallback(async () => {
    try {
      await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: seedMovie.id, profileId: profile.id }),
      });
      const response = await fetch(`/api/cuts/prepare?movieId=${seedMovie.id}&profileId=${profile.id}`);
      const data = await response.json();
      if (!data.success || !data.manifest) throw new Error(data.error || "Unable to prepare cut");
      setManifest(data.manifest);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to prepare cut");
    }
  }, [profile.id]);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadManifest, 0);
    const interval = window.setInterval(loadManifest, 3000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadManifest]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mimeType || !manifestKey) return;
    if (!("MediaSource" in window) || !MediaSource.isTypeSupported(mimeType)) {
      queueMicrotask(() => setError(`MSE unsupported: ${mimeType}`));
      return;
    }

    const mediaSource = new MediaSource();
    const objectUrl = URL.createObjectURL(mediaSource);
    mediaSourceRef.current = mediaSource;
    objectUrlRef.current = objectUrl;
    readyRef.current = false;
    video.src = objectUrl;

    const appendSegments = async () => {
      try {
        const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
        sourceBuffer.mode = "sequence";
        for (const segment of segmentsRef.current) {
          const response = await fetch(segment.mseAssetUrl);
          if (!response.ok) throw new Error(`Failed to load ${segment.mseAssetUrl}`);
          const buffer = await response.arrayBuffer();
          await new Promise<void>((resolve, reject) => {
            sourceBuffer.addEventListener("updateend", () => resolve(), { once: true });
            sourceBuffer.addEventListener("error", () => reject(new Error(`Failed to append ${segment.mseAssetUrl}`)), { once: true });
            sourceBuffer.appendBuffer(buffer);
          });
        }
        if (mediaSource.readyState === "open") mediaSource.endOfStream();
        readyRef.current = true;
        video.currentTime = seekSecondsRef.current;
        if (playingRef.current) await video.play();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Cut playback failed");
      }
    };

    mediaSource.addEventListener("sourceopen", appendSegments, { once: true });
    return () => {
      readyRef.current = false;
      mediaSource.removeEventListener("sourceopen", appendSegments);
      video.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      mediaSourceRef.current = null;
    };
  }, [manifestKey, mimeType]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !readyRef.current) return;
    if (playing) video.play().catch((cause) => setError(String(cause)));
    else video.pause();
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !readyRef.current) return;
    video.currentTime = seekSeconds;
  }, [seekRevision, seekSeconds]);

  return (
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col">
      <CardHeader className="py-3 px-4 bg-zinc-950 border-b border-zinc-800">
        <div className="flex justify-between items-center gap-2">
          <div className="font-semibold text-slate-200 truncate">{profile.displayName} · {profile.city}</div>
          <Badge variant="outline" className="border-zinc-700 text-slate-400 shrink-0">{profile.languageLabel}</Badge>
        </div>
      </CardHeader>
      <div className="aspect-video bg-black relative">
        <video ref={videoRef} className="size-full object-contain" playsInline onTimeUpdate={(event) => setTimelineTime(event.currentTarget.currentTime)} />
        {!manifest && <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm gap-2"><LoaderCircle className="size-4 animate-spin" /> Preparing cut</div>}
      </div>
      <div className="px-4 py-3 border-t border-zinc-800 text-xs text-slate-400 flex justify-between gap-2">
        <span className="truncate">{currentSegment?.label || "Canonical scene"}</span>
        <span className={currentSegment?.source === "GENERATED_CLIP" ? "text-emerald-400 shrink-0" : "text-amber-400 shrink-0"}>{currentSegment?.source === "GENERATED_CLIP" ? "Generated" : "Fallback"}</span>
      </div>
      {error && <div className="px-4 pb-3 text-xs text-red-300">{error}</div>}
    </Card>
  );
}

export default function CompareMoviePage() {
  const { movieId } = useParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekSeconds, setSeekSeconds] = useState(0);
  const [seekRevision, setSeekRevision] = useState(0);

  const jumpToSlot = (slotId: string) => {
    const slot = seedSlots.find((candidate) => candidate.id === slotId);
    if (!slot) return;
    setSeekSeconds(slot.startSeconds);
    setSeekRevision((revision) => revision + 1);
  };

  if (movieId !== seedMovie.id) return <main className="p-8">Movie not found</main>;

  return (
    <main className="min-h-screen p-8 max-w-[1600px] mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm mb-2 inline-block">&larr; Back to Home</Link>
          <h1 className="text-3xl font-bold">Compare Cuts: {seedMovie.title}</h1>
        </div>
        <Button variant="outline" className="border-zinc-700 bg-zinc-900" onClick={() => setIsPlaying((value) => !value)}>{isPlaying ? "Pause All" : "Play All"}</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {seedProfiles.slice(0, 3).map((profile) => <CutPlayer key={profile.id} profile={profile} playing={isPlaying} seekSeconds={seekSeconds} seekRevision={seekRevision} />)}
      </div>

      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {seedSlots.map((slot) => <Button key={slot.id} variant="secondary" onClick={() => jumpToSlot(slot.id)}>{slot.label}</Button>)}
      </div>
    </main>
  );
}
