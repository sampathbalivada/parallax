"use server";

import { exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs";
import { allMovies, publicMediaPathFromUrl } from "@/lib/data/studio-store";
import { seedSlots } from "@/lib/data/seed";
import { buildCanonicalGapClips, orderedEnabledSlots } from "@/lib/playback/clips";
import { exportPlaybackFragmentForAsset } from "@/lib/playback/fragment-export";

const execPromise = util.promisify(exec);

export async function exportSegmentsAction(movieId: string) {
  const movie = allMovies().find((candidate) => candidate.id === movieId);
  if (!movie) {
    throw new Error("Movie not found");
  }

  const inputPath = publicMediaPathFromUrl(movie.canonicalVideoUrl);
  const fallbackDir = path.join(process.cwd(), "public", "media", "fallbacks");
  const canonicalGapDir = path.join(process.cwd(), "public", "media", "canonical-gaps");
  const playbackFragmentDir = path.join(process.cwd(), "public", "media", "playback-fragments");
  
  if (!fs.existsSync(inputPath)) {
    throw new Error(`${movie.canonicalVideoUrl} not found in public/`);
  }

  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }

  if (!fs.existsSync(canonicalGapDir)) {
    fs.mkdirSync(canonicalGapDir, { recursive: true });
  }

  if (!fs.existsSync(playbackFragmentDir)) {
    fs.mkdirSync(playbackFragmentDir, { recursive: true });
  }

  try {
    const movieSlots = seedSlots.filter((slot) => slot.movieId === movie.id);
    const orderedSlots = orderedEnabledSlots(movie, movieSlots);
    const canonicalGaps = buildCanonicalGapClips(movie, movieSlots);

    for (const gap of canonicalGaps) {
      const outputPath = path.join(process.cwd(), "public", gap.url);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      const duration = gap.endSeconds - gap.startSeconds;
      const cmd = `ffmpeg -y -ss ${gap.startSeconds} -i "${inputPath}" -t ${duration} -c:v libx264 -preset fast -crf 23 -c:a aac -movflags +faststart "${outputPath}"`;

      console.log(`Exporting ${gap.id} from ${gap.startSeconds} to ${gap.endSeconds}...`);
      await execPromise(cmd);
      await exportPlaybackFragmentForAsset(gap.url);
    }

    for (const slot of orderedSlots) {
      const outputPath = path.join(fallbackDir, `${slot.id}-generic.mp4`);
      const duration = slot.endSeconds - slot.startSeconds;
      
      // We re-encode slightly to ensure accurate cuts regardless of keyframes
      const cmd = `ffmpeg -y -ss ${slot.startSeconds} -i "${inputPath}" -t ${duration} -c:v libx264 -preset fast -crf 23 -c:a aac -movflags +faststart "${outputPath}"`;
      
      console.log(`Exporting ${slot.id} segment from ${slot.startSeconds} to ${slot.endSeconds}...`);
      await execPromise(cmd);
      await exportPlaybackFragmentForAsset(slot.canonicalFallbackUrl);
    }
    return { success: true };
  } catch (error) {
    console.error("FFmpeg export failed:", error);
    return { success: false, error: String(error) };
  }
}
