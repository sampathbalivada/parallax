import { NextRequest, NextResponse } from "next/server";
import { seedSlots, seedProfiles } from "@/lib/data/seed";
import { allMovies, slotsForMovie } from "@/lib/data/studio-store";
import { GenerationQueue } from "@/lib/jobs/generation-queue";
import { VideoGenerationService } from "@/lib/ai/video-generation.service";
import { GenerationJob } from "@/lib/types";
import { exportPlaybackFragmentForAsset } from "@/lib/playback/fragment-export";
import fs from "fs";
import path from "path";

// Async function to run generation process in the background
const processJob = async (job: GenerationJob) => {
  const slot = seedSlots.find(s => s.movieId === job.movieId && s.id === job.slotId);
  const profile = job.profileSnapshot;
  
  if (!slot || !profile) {
    await GenerationQueue.updateJob(job.id, { status: "FAILED", failureReason: "Slot or Profile not found" });
    return;
  }

  // Check if file is already on disk as a failsafe
  const fileName = `${job.id}.mp4`;
  const filePath = path.join(process.cwd(), 'public', 'media', 'generated', fileName);
  if (fs.existsSync(filePath)) {
    console.log(`Job ${job.id} already has generated video on disk. Bypassing API generation.`);
    const videoAssetUrl = `/media/generated/${fileName}`;
    await exportPlaybackFragmentForAsset(videoAssetUrl);
    await GenerationQueue.updateJob(job.id, { 
      status: "READY", 
      videoAssetUrl,
      completedAt: new Date().toISOString()
    });
    return;
  }

  try {
    // Generate Video directly with Omni (image generation bypassed as requested)
    await GenerationQueue.updateJob(job.id, { status: "GENERATING_VIDEO" });
    const videoUrl = await VideoGenerationService.generateVideoInsert(slot, profile, job.id);
    await exportPlaybackFragmentForAsset(videoUrl);

    // Mark job as ready
    await GenerationQueue.updateJob(job.id, { 
      status: "READY", 
      videoAssetUrl: videoUrl,
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    await GenerationQueue.updateJob(job.id, { status: "FAILED", failureReason: String(error) });
  }
};

export async function POST(req: NextRequest) {
  try {
    const { movieId, profileId, slotId, force = false } = await req.json();

    const profile = seedProfiles.find(p => p.id === profileId);
    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 400 });
    }

    const movie = allMovies().find((candidate) => candidate.id === movieId);
    if (!movie) {
      return NextResponse.json({ success: false, error: "Movie not found" }, { status: 400 });
    }

    const movieSlots = slotsForMovie(movie.id);
    const requestedSlots = slotId ? movieSlots.filter((slot) => slot.id === slotId) : movieSlots;
    if (slotId && requestedSlots.length === 0) {
      return NextResponse.json({ success: false, error: "Segment not found" }, { status: 400 });
    }

    const enqueuedJobs: GenerationJob[] = [];

    // Queue up jobs for all adaptive slots
    for (const slot of requestedSlots) {
      const baseJobId = `job-${movieId}-${slot.id}-${profileId}`;
      const jobId = force ? `${baseJobId}-v${Date.now()}` : baseJobId;
      let job = await GenerationQueue.getJob(jobId);

      // Check if file is already generated and stored in /generated directory
      const fileName = `${jobId}.mp4`;
      const filePath = path.join(process.cwd(), 'public', 'media', 'generated', fileName);
      const fileExists = fs.existsSync(filePath);

      if (fileExists) {
        const videoAssetUrl = `/media/generated/${fileName}`;
        await exportPlaybackFragmentForAsset(videoAssetUrl);
        // If file exists, ensure there is a READY job associated with it
        if (!job || job.status !== "READY") {
          job = {
            id: jobId,
            movieId,
            slotId: slot.id,
            profileId,
            profileSnapshot: profile,
            status: "READY",
            videoAssetUrl,
            cacheKey: `${slot.id}-${profile.locale}-${profile.city}`,
            approved: false,
            startedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
          };
          await GenerationQueue.enqueue(job);
        }
      } else if (!job) {
        // Enqueue background processing if not exists
        job = {
          id: jobId,
          movieId,
          slotId: slot.id,
          profileId,
          profileSnapshot: profile,
          status: "QUEUED",
          cacheKey: `${slot.id}-${profile.locale}-${profile.city}`,
          approved: false,
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        await GenerationQueue.enqueue(job);
        
        // Fire and forget the background process
        processJob(job);
      }
      
      enqueuedJobs.push(job);
    }

    return NextResponse.json({ success: true, jobs: enqueuedJobs });
  } catch (error) {
    console.error("Failed to enqueue jobs:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
