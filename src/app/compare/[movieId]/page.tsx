"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { seedMovie, seedSlots, seedProfiles } from "@/lib/data/seed";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CompareMoviePage() {
  const { movieId } = useParams();
  const [isPlaying, setIsPlaying] = useState(false);
  
  // For the compare screen we load all seeded profiles to compare side-by-side
  const profilesToCompare = seedProfiles.slice(0, 3);
  const slots = seedSlots;

  return (
    <main className="min-h-screen p-8 max-w-[1600px] mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm mb-2 inline-block">
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold">Compare Cuts: {seedMovie.title}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="border-zinc-700 bg-zinc-900"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? 'Pause All' : 'Play All'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {profilesToCompare.map(profile => (
          <Card key={profile.id} className="bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col">
            <CardHeader className="py-3 px-4 bg-zinc-950 border-b border-zinc-800">
               <div className="flex justify-between items-center">
                  <div className="font-semibold text-slate-200">{profile.city}</div>
                  <div className="text-xs text-slate-400">{profile.languageLabel}</div>
               </div>
            </CardHeader>
            <div className="aspect-video bg-black flex flex-col items-center justify-center border-b border-zinc-800 relative">
               <span className="text-zinc-700 text-sm">Video Player Mock ({profile.id})</span>
               
               {isPlaying && (
                 <div className="absolute top-4 right-4 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-xs text-red-500 font-mono">Playing</span>
                 </div>
               )}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-center gap-4">
         <span className="text-sm text-slate-500 flex items-center mr-4">Jump to slot:</span>
         {slots.map(slot => (
           <Button key={slot.id} variant="secondary">
             {slot.label}
           </Button>
         ))}
      </div>
    </main>
  );
}
