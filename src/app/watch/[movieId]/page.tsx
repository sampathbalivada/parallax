"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { seedMovie, seedSlots, seedProfiles } from "@/lib/data/seed";
import { PlaybackSegment, GenerationJob } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WatchMoviePage() {
  const { movieId } = useParams();
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profile");

  const movie = seedMovie;
  const slots = seedSlots;
  const profile = seedProfiles.find(p => p.id === profileId) || seedProfiles[0];

  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Segments setup
  const [segments, setSegments] = useState<PlaybackSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);

  useEffect(() => {
    setIsClient(true);
    
    // Trigger generation automatically when the page loads for a specific profile
    if (profileId) {
      fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId, profileId })
      }).catch(console.error);
    }
  }, [movieId, profileId]);

  // Polling for job status
  useEffect(() => {
    if (!profileId) return;
    
    const interval = setInterval(() => {
      fetch(`/api/jobs?movieId=${movieId}&profileId=${profileId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.jobs) {
            setJobs(data.jobs);
          }
        })
        .catch(console.error);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [movieId, profileId]);

  useEffect(() => {
    // Build a mock list of segments based on the slots
    // In a real implementation, this comes from the /api/cuts/prepare endpoint
    const buildSegments = () => {
      const mockSegments: PlaybackSegment[] = [];
      let currentTime = 0;

      slots.forEach((slot, index) => {
        // Add canonical segment before the slot if there is a gap
        if (slot.startSeconds > currentTime) {
          mockSegments.push({
            id: `canonical-before-${slot.id}`,
            type: "CANONICAL",
            startSeconds: currentTime,
            endSeconds: slot.startSeconds,
            canonicalUrl: movie.canonicalVideoUrl, // Mock URL
            activeUrl: movie.canonicalVideoUrl,
            status: "READY"
          });
        }
        // Find corresponding job for this slot
        const job = jobs.find(j => j.slotId === slot.id);
        
        let status = "FALLBACK";
        let activeUrl = slot.canonicalFallbackUrl;
        
        if (job) {
          if (job.status === "READY" && job.videoAssetUrl) {
            status = "READY";
            activeUrl = job.videoAssetUrl;
          } else if (job.status === "FAILED") {
            status = "FAILED";
          } else {
            status = job.status;
          }
        }
        
        mockSegments.push({
          id: slot.id,
          type: "ADAPTIVE",
          startSeconds: slot.startSeconds,
          endSeconds: slot.endSeconds,
          canonicalUrl: slot.canonicalFallbackUrl,
          activeUrl: activeUrl, 
          status: status as any
        });

        currentTime = slot.endSeconds;
      });

      // Add remaining canonical segment
      if (currentTime < movie.durationSeconds) {
        mockSegments.push({
          id: `canonical-end`,
          type: "CANONICAL",
          startSeconds: currentTime,
          endSeconds: movie.durationSeconds,
          canonicalUrl: movie.canonicalVideoUrl,
          activeUrl: movie.canonicalVideoUrl,
          status: "READY"
        });
      }

      setSegments(mockSegments);
    };

    buildSegments();
  }, [movie, slots, jobs]);

  useEffect(() => {
    if (!videoRef.current || segments.length === 0 || !isClient) return;

    const segment = segments[currentSegmentIndex];
    
    // Only update src if it's different to avoid reloading
    if (videoRef.current.getAttribute('src') !== segment.activeUrl) {
      videoRef.current.src = segment.activeUrl;
      videoRef.current.load();
      
      // If canonical, seek to the start of this segment within the full video
      if (segment.type === 'CANONICAL') {
        videoRef.current.currentTime = segment.startSeconds;
      }
    }

    if (isPlaying) {
      videoRef.current.play().catch(e => console.error("Playback failed", e));
    } else {
      videoRef.current.pause();
    }
  }, [currentSegmentIndex, segments, isPlaying, isClient]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || segments.length === 0) return;
    
    const currentSegment = segments[currentSegmentIndex];
    const currentTime = videoRef.current.currentTime;

    // Check if we've reached the end of the current segment
    let shouldAdvance = false;
    
    if (currentSegment.type === 'CANONICAL') {
      // Canonical video is the full file, so we check absolute time
      if (currentTime >= currentSegment.endSeconds) {
        shouldAdvance = true;
      }
    } else {
      // Adaptive video is a short clip, so we wait until it ends (or reaches duration)
      // We rely on onEnded for short clips, but as a fallback check duration
      if (currentTime >= (currentSegment.endSeconds - currentSegment.startSeconds)) {
        shouldAdvance = true;
      }
    }

    if (shouldAdvance) {
      handleEnded();
    }
  };

  const handleEnded = () => {
    if (currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentSegmentIndex(0); // reset to beginning
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
        {/* Fake Video Player area */}
        <div className="aspect-video bg-black flex flex-col items-center justify-center relative">
          
          <video 
            ref={videoRef}
            className="w-full h-full object-cover"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            controls={false}
            playsInline
          />
          
          {/* Debug overlay (optional, remove in production) */}
          <div className="absolute top-4 left-4 p-2 bg-black/60 rounded text-xs font-mono text-white/50 pointer-events-none">
            Segment: {segments[currentSegmentIndex]?.type} ({currentSegmentIndex + 1}/{segments.length})
          </div>

          {/* Fake Player Controls overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-4">
            <button 
              className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center font-bold"
              onClick={() => {
                setIsPlaying(!isPlaying);
              }}
            >
              {isPlaying ? '||' : '▶'}
            </button>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full relative overflow-hidden">
               {/* Total progress calculation */}
               <div 
                 className="absolute top-0 left-0 bottom-0 bg-[#E50914] transition-all duration-300" 
                 style={{ 
                   width: videoRef.current && segments.length > 0 
                     ? `${(segments[currentSegmentIndex]?.type === 'CANONICAL' ? videoRef.current.currentTime : segments[currentSegmentIndex].startSeconds + videoRef.current.currentTime) / movie.durationSeconds * 100}%` 
                     : '0%' 
                 }}
               />
            </div>
          </div>
        </div>
        
        <CardContent className="p-4 border-t border-zinc-800 bg-zinc-950">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Segment Status</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {segments.filter(s => s.type === 'ADAPTIVE').map(segment => (
                 <div key={segment.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col gap-2">
                    <div className="font-medium text-slate-200 text-sm">{slots.find(s => s.id === segment.id)?.label || segment.id}</div>
                     <div className="flex justify-between items-center text-xs">
                       <span className="text-slate-500">Status</span>
                       <Badge variant="outline" className={
                         segment.status === 'READY' ? 'text-green-400 border-green-900' : 
                         segment.status === 'FALLBACK' ? 'text-amber-400 border-amber-900' : 
                         segment.status === 'FAILED' ? 'text-red-400 border-red-900' : 
                         'text-blue-400 border-blue-900 animate-pulse'
                       }>
                         {segment.status}
                       </Badge>
                     </div>
                     <div className="flex justify-between items-center text-xs mt-1">
                       <span className="text-slate-500">Source</span>
                       <span className="text-slate-400 font-mono">
                         {segment.status === 'READY' ? 'Generated Asset' : 'Canonical Fallback'}
                       </span>
                     </div>
                 </div>
              ))}
           </div>
        </CardContent>
      </Card>
    </main>
  );
}
