import { NextRequest, NextResponse } from "next/server";
import { seedMovie, seedSlots, seedProfiles } from "@/lib/data/seed";
import { GenerationQueue } from "@/lib/jobs/generation-queue";
import { ImageGenerationService } from "@/lib/ai/image-generation.service";
import { VideoGenerationService } from "@/lib/ai/video-generation.service";
import { GenerationJob } from "@/lib/types";

// Async function to run generation process in the background
const processJob = async (job: GenerationJob) => {
  const slot = seedSlots.find(s => s.id === job.slotId);
  const profile = job.profileSnapshot;
  
  if (!slot || !profile) {
    await GenerationQueue.updateJob(job.id, { status: "FAILED", failureReason: "Slot or Profile not found" });
    return;
  }

  try {
    let imageUrl: string | undefined;

    // 1. Generate Image (if required)
    if (slot.generationStrategy === "IMAGE_THEN_VIDEO" || slot.generationStrategy === "IMAGE_COMPOSITE") {
      await GenerationQueue.updateJob(job.id, { status: "GENERATING_IMAGE" });
      imageUrl = await ImageGenerationService.generateKeyframe(slot, profile, job.id);
      await GenerationQueue.updateJob(job.id, { status: "IMAGE_READY", imageAssetUrl: imageUrl });
    }

    // 2. Generate Video
    await GenerationQueue.updateJob(job.id, { status: "GENERATING_VIDEO" });
    const videoUrl = await VideoGenerationService.generateVideoInsert(slot, profile, job.id, imageUrl);

    // 3. Mark job as ready
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
    const { movieId, profileId } = await req.json();

    const profile = seedProfiles.find(p => p.id === profileId);
    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 400 });
    }

    if (movieId !== seedMovie.id) {
      return NextResponse.json({ success: false, error: "Movie not found" }, { status: 400 });
    }

    const enqueuedJobs: GenerationJob[] = [];

    // Queue up jobs for all adaptive slots
    for (const slot of seedSlots) {
      // Check if job already exists for this slot & profile
      const jobId = `job-${movieId}-${slot.id}-${profileId}`;
      let job = await GenerationQueue.getJob(jobId);

      if (!job) {
        job = {
          id: jobId,
          movieId,
          slotId: slot.id,
          profileId,
          profileSnapshot: profile,
          status: "QUEUED",
          cacheKey: `${slot.id}-${profile.locale}-${profile.city}`,
          approved: false,
          startedAt: new Date().toISOString()
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
