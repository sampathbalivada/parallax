import { NextRequest, NextResponse } from "next/server";
import { GenerationQueue } from "@/lib/jobs/generation-queue";
import { buildPlaybackManifest } from "@/lib/playback/manifest";
import { allMovies, slotsForMovie } from "@/lib/data/studio-store";
import fs from "fs";
import path from "path";

function publicAssetExists(assetUrl: string) {
  const relativePath = assetUrl.startsWith("/") ? assetUrl.slice(1) : assetUrl;
  return fs.existsSync(path.join(process.cwd(), "public", relativePath));
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const movieId = url.searchParams.get("movieId");
    const profileId = url.searchParams.get("profileId");
    const movie = allMovies().find((candidate) => candidate.id === movieId);

    if (!movie) {
      return NextResponse.json({ success: false, error: "Movie not found" }, { status: 404 });
    }

    const allJobs = await GenerationQueue.getAllJobs();
    const jobs = profileId ? allJobs.filter((job) => job.movieId === movie.id && job.profileId === profileId) : [];
    const manifest = buildPlaybackManifest({ movie, slots: slotsForMovie(movie.id), jobs, assetExists: publicAssetExists });

    return NextResponse.json({ success: true, manifest });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
