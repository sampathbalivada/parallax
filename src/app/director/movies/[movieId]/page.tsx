"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { exportSegmentsAction } from "@/app/actions";
import { seedMovie, seedSlots } from "@/lib/data/seed";
import { GenerationJob } from "@/lib/types";
import { seedProfiles } from "@/lib/data/seed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoaderCircle, Plus, RefreshCw } from "lucide-react";

export default function DirectorMoviePage() {
  const { movieId } = useParams();
  const movie = seedMovie; // In a real app, fetch based on movieId
  const slots = seedSlots;
  
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(slots[0]?.id || null);
  const [isExporting, setIsExporting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const FRAME_TIME = 1 / 24; // Assuming 24fps

  
  // New Segment Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSegment, setNewSegment] = useState({
    label: "",
    type: "LOCALIZED_PROP",
    startSeconds: 0,
    endSeconds: 5,
    narrativePurpose: "",
    editableFields: "",
    immutableFacts: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(seedProfiles[0]?.id || "");
  const [variants, setVariants] = useState<GenerationJob[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  const loadVariants = useCallback(async () => {
    const response = await fetch(`/api/jobs?movieId=${movie.id}`);
    const data = await response.json();
    if (data.success) setVariants(data.jobs);
  }, [movie.id]);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadVariants, 0);
    const interval = window.setInterval(loadVariants, 3000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadVariants]);

  const handleRegenerate = async () => {
    if (!selectedSlot || !selectedProfileId) return;
    setIsRegenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: movie.id, profileId: selectedProfileId, slotId: selectedSlot.id, force: true }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Generation failed");
      await loadVariants();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setIsRegenerating(false);
    }
  };

  const selectedVariants = variants
    .filter((variant) => variant.slotId === selectedSlotId)
    .sort((left, right) => new Date(right.createdAt || right.startedAt || 0).getTime() - new Date(left.createdAt || left.startedAt || 0).getTime());

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await exportSegmentsAction();
      if (res.success) {
        alert("Segments exported successfully!");
      } else {
        alert("Export failed: " + res.error);
      }
    } catch {
      alert("Export failed!");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Save metadata to API (which updates seed.ts)
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSegment,
          movieId,
          editableFields: newSegment.editableFields.split(",").map(s => s.trim()).filter(Boolean),
          immutableFacts: newSegment.immutableFacts.split(",").map(s => s.trim()).filter(Boolean),
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // 2. Trigger FFmpeg export specifically for this (or simply re-run the full export action)
        // For simplicity, we just run the action that processes all seedSlots (it will pick up the new one on next server start, 
        // but wait, seedSlots is statically imported in actions.ts. 
        // A better approach for the hackathon is to just reload the page so Next.js re-evaluates seed.ts
        alert("Segment added! Reloading page to apply changes and you can then click 'Export Fallback Segments' to cut the video.");
        window.location.reload();
      } else {
        alert("Error saving: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error saving segment.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSegment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this segment?")) return;
    try {
      const res = await fetch(`/api/segments?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        alert("Error deleting: " + data.error);
      }
    } catch {
      alert("Error deleting segment.");
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * movie.durationSeconds;
  };

  const changePlaybackRate = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const stepFrame = (forward: boolean) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime += forward ? FRAME_TIME : -FRAME_TIME;
  };

  if (movieId !== movie.id) {
    return <div className="p-8">Movie not found</div>;
  }

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Link href="/director" className="text-indigo-400 hover:text-indigo-300 text-sm mb-2 inline-block">
            &larr; Back to Director Studio
          </Link>
          <h1 className="text-3xl font-bold">{movie.title}</h1>
        </div>
        <div className="flex gap-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-indigo-500 text-indigo-400 hover:bg-indigo-950 px-4 py-2">
              <Plus className="w-4 h-4 mr-2" />
              Add Segment
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-slate-200">
              <DialogHeader>
                <DialogTitle>Add New Adaptive Segment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveSegment} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="label">Segment Label</Label>
                    <Input id="label" required className="bg-zinc-900 border-zinc-700" value={newSegment.label} onChange={e => setNewSegment({...newSegment, label: e.target.value})} placeholder="e.g. Hero Close-up" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <select id="type" className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50" value={newSegment.type} onChange={e => setNewSegment({...newSegment, type: e.target.value})}>
                      <option value="CITY_ESTABLISHING">City Establishing</option>
                      <option value="LOCALIZED_PROP">Localized Prop</option>
                      <option value="DIEGETIC_SCREEN">Diegetic Screen</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start (seconds)</Label>
                    <div className="flex gap-2">
                      <Input id="start" type="number" required min="0" step="0.001" className="bg-zinc-900 border-zinc-700 flex-1" value={newSegment.startSeconds} onChange={e => setNewSegment({...newSegment, startSeconds: Number(e.target.value)})} />
                      <Button type="button" variant="secondary" onClick={() => setNewSegment({...newSegment, startSeconds: Number(currentTime.toFixed(3))})}>
                        Use Current
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End (seconds)</Label>
                    <div className="flex gap-2">
                      <Input id="end" type="number" required min="0" step="0.001" className="bg-zinc-900 border-zinc-700 flex-1" value={newSegment.endSeconds} onChange={e => setNewSegment({...newSegment, endSeconds: Number(e.target.value)})} />
                      <Button type="button" variant="secondary" onClick={() => setNewSegment({...newSegment, endSeconds: Number(currentTime.toFixed(3))})}>
                        Use Current
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose">Narrative Purpose</Label>
                  <Textarea id="purpose" required className="bg-zinc-900 border-zinc-700" value={newSegment.narrativePurpose} onChange={e => setNewSegment({...newSegment, narrativePurpose: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editable">Editable Fields (comma separated)</Label>
                  <Input id="editable" className="bg-zinc-900 border-zinc-700" value={newSegment.editableFields} onChange={e => setNewSegment({...newSegment, editableFields: e.target.value})} placeholder="e.g. language, city name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="immutable">Immutable Facts (comma separated)</Label>
                  <Input id="immutable" className="bg-zinc-900 border-zinc-700" value={newSegment.immutableFacts} onChange={e => setNewSegment({...newSegment, immutableFacts: e.target.value})} placeholder="e.g. Nighttime, Raining" />
                </div>
                <Button type="submit" disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4">
                  {isSaving ? "Saving..." : "Save Segment"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="bg-[#E50914] hover:bg-[#b80710] text-white px-4 py-2 font-medium disabled:opacity-50"
          >
            {isExporting ? "Exporting..." : "Export Fallback Segments"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Preview & Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
           <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
             <div className="aspect-video bg-black flex items-center justify-center relative group">
               <video 
                 ref={videoRef}
                 src={movie.canonicalVideoUrl} 
                 className="w-full h-full object-cover"
                 playsInline
                 onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                 onEnded={() => setIsPlaying(false)}
                 onClick={togglePlay}
               />
               
               {/* Play/Pause Overlay */}
               <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-100 bg-black/40'}`}>
                 <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                   <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[16px] border-l-white border-b-8 border-b-transparent ml-2" />
                 </div>
               </div>

               {/* Custom Timeline */}
               <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                 
                 <div className="flex items-center gap-1 bg-zinc-900/80 rounded-md p-1">
                   <button onClick={() => stepFrame(false)} className="px-2 text-xs text-white hover:text-indigo-400" title="Previous Frame">
                     &lt;|
                   </button>
                   <button onClick={togglePlay} className="px-2 text-white hover:text-indigo-400">
                     {isPlaying ? '⏸' : '▶'}
                   </button>
                   <button onClick={() => stepFrame(true)} className="px-2 text-xs text-white hover:text-indigo-400" title="Next Frame">
                     |&gt;
                   </button>
                 </div>

                 <select 
                   value={playbackRate} 
                   onChange={(e) => changePlaybackRate(Number(e.target.value))}
                   className="bg-zinc-900/80 text-white text-xs rounded-md px-2 py-1 outline-none border border-zinc-700 hover:border-indigo-500 cursor-pointer"
                 >
                   <option value={0.25}>0.25x</option>
                   <option value={0.5}>0.5x</option>
                   <option value={1}>1.0x</option>
                   <option value={1.5}>1.5x</option>
                   <option value={2}>2.0x</option>
                 </select>

                 <div className="text-xs text-slate-300 font-mono w-14 text-center">
                   {currentTime.toFixed(3)}s
                 </div>
                 <div className="flex-1 h-3 bg-zinc-800/80 rounded-full relative cursor-pointer overflow-hidden ml-2" onClick={handleTimelineClick}>
                    {/* Playback progress */}
                    <div className="absolute top-0 left-0 bottom-0 bg-[#E50914] pointer-events-none" style={{ width: `${(currentTime / movie.durationSeconds) * 100}%` }} />
                    
                    {/* Timeline markers overlay */}
                    {slots.map(slot => {
                       const startPercent = (slot.startSeconds / movie.durationSeconds) * 100;
                       const widthPercent = ((slot.endSeconds - slot.startSeconds) / movie.durationSeconds) * 100;
                       return (
                         <div 
                           key={slot.id}
                           className={`absolute h-full pointer-events-none transition-colors ${selectedSlotId === slot.id ? 'bg-indigo-500/80' : 'bg-indigo-900/60'}`}
                           style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                         />
                       );
                    })}
                 </div>
               </div>
             </div>
             <CardContent className="p-4 flex gap-2 overflow-x-auto border-t border-zinc-800">
               {slots.map(slot => (
                 <Badge 
                    key={slot.id} 
                    variant={selectedSlotId === slot.id ? "default" : "secondary"}
                    className={`cursor-pointer ${selectedSlotId === slot.id ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-zinc-800 hover:bg-zinc-700 text-slate-300 border-zinc-700'}`}
                    onClick={() => setSelectedSlotId(slot.id)}
                  >
                    {slot.label} ({slot.startSeconds.toFixed(3)}s - {slot.endSeconds.toFixed(3)}s)
                 </Badge>
               ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Inspector */}
        <div className="flex flex-col gap-6 h-full">
          {selectedSlot ? (
            <Card className="bg-zinc-900 border-zinc-800 h-full">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-xl">{selectedSlot.label}</CardTitle>
                  <div className="text-sm text-slate-400 font-mono">{selectedSlot.type}</div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteSegment(selectedSlot.id)}>
                  Delete
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm text-slate-300">
                <div>
                  <strong className="block text-slate-100 mb-1">Narrative Purpose</strong>
                  {selectedSlot.narrativePurpose}
                </div>
                
                <div>
                  <strong className="block text-slate-100 mb-1">Editable Fields</strong>
                  <div className="flex flex-wrap gap-1">
                    {selectedSlot.editableFields.map(f => <Badge key={f} variant="outline" className="border-zinc-700 bg-zinc-800/50">{f}</Badge>)}
                  </div>
                </div>

                <div>
                  <strong className="block text-slate-100 mb-1">Immutable Facts</strong>
                  <ul className="list-disc pl-4 space-y-1">
                    {selectedSlot.immutableFacts.map(f => <li key={f}>{f}</li>)}
                  </ul>
                </div>
                
                <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-slate-400">Generated Variants</div>
                    <span className="text-xs text-zinc-500">Latest ready variant powers viewer cut</span>
                  </div>
                  <div className="flex gap-2">
                    <select
                      aria-label="Viewer profile"
                      value={selectedProfileId}
                      onChange={(event) => setSelectedProfileId(event.target.value)}
                      className="h-9 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-slate-200"
                    >
                      {seedProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName} · {profile.city}</option>)}
                    </select>
                    <Button size="sm" onClick={handleRegenerate} disabled={isRegenerating} title="Generate new variant">
                      {isRegenerating ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                      <span className="sr-only">Regenerate selected segment</span>
                    </Button>
                  </div>
                  {selectedVariants.length ? (
                    <div className="space-y-2">
                      {selectedVariants.map((variant, index) => {
                        const profile = seedProfiles.find((candidate) => candidate.id === variant.profileId) || variant.profileSnapshot;
                        return (
                          <div key={variant.id} className="border border-zinc-800 bg-zinc-950 p-3 rounded-md space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-200 truncate">{profile.displayName} · {profile.city}</span>
                              <Badge variant="outline" className={variant.status === "READY" ? "border-emerald-700 text-emerald-300" : variant.status === "FAILED" ? "border-red-800 text-red-300" : "border-amber-700 text-amber-300"}>{variant.status}</Badge>
                            </div>
                            <div className="text-xs text-zinc-500">{index === 0 ? "Current" : "Previous"} · {new Date(variant.createdAt || variant.startedAt || 0).toLocaleString()}</div>
                            {variant.videoAssetUrl && <video className="w-full aspect-video bg-black" controls preload="metadata" src={variant.videoAssetUrl} />}
                            {variant.failureReason && <div className="text-xs text-red-300">{variant.failureReason}</div>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-md text-center text-zinc-600">No variants generated yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
             <div className="h-full flex items-center justify-center text-slate-500 border border-dashed border-zinc-800 rounded-xl">
               Select a slot to inspect
             </div>
          )}
        </div>
      </div>
    </main>
  );
}
