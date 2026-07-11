import { NextRequest, NextResponse } from "next/server";
import { GenerationQueue } from "@/lib/jobs/generation-queue";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const movieId = url.searchParams.get("movieId");
    const profileId = url.searchParams.get("profileId");

    const allJobs = await GenerationQueue.getAllJobs();

    // Filter jobs if query params are provided
    let filteredJobs = allJobs;
    if (movieId) {
      filteredJobs = filteredJobs.filter(j => j.movieId === movieId);
    }
    if (profileId) {
      filteredJobs = filteredJobs.filter(j => j.profileId === profileId);
    }

    return NextResponse.json({ success: true, jobs: filteredJobs });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
