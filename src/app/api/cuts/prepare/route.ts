import { NextRequest, NextResponse } from "next/server";
import { seedMovie, seedSlots } from "@/lib/data/seed";
import { GenerationQueue } from "@/lib/jobs/generation-queue";
import { buildPlaybackManifest } from "@/lib/playback/manifest";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const movieId = url.searchParams.get("movieId");
    const profileId = url.searchParams.get("profileId");

    if (movieId !== seedMovie.id) {
      return NextResponse.json({ success: false, error: "Movie not found" }, { status: 404 });
    }

    const allJobs = await GenerationQueue.getAllJobs();
    const jobs = profileId ? allJobs.filter((job) => job.movieId === movieId && job.profileId === profileId) : [];
    const manifest = buildPlaybackManifest({ movie: seedMovie, slots: seedSlots, jobs });

    return NextResponse.json({ success: true, manifest });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
