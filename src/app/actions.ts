"use server";

import { exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs";
import { seedMovie, seedSlots } from "@/lib/data/seed";
import { buildCanonicalGapClips, orderedEnabledSlots } from "@/lib/playback/clips";
import { exportPlaybackFragmentForAsset } from "@/lib/playback/fragment-export";

const execPromise = util.promisify(exec);

export async function exportSegmentsAction() {
  const inputPath = path.join(process.cwd(), "public", "media", "canonical-full.mp4");
  const fallbackDir = path.join(process.cwd(), "public", "media", "fallbacks");
  const canonicalGapDir = path.join(process.cwd(), "public", "media", "canonical-gaps");
  const playbackFragmentDir = path.join(process.cwd(), "public", "media", "playback-fragments");
  
  if (!fs.existsSync(inputPath)) {
    throw new Error("canonical-full.mp4 not found in public/media/");
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
    const orderedSlots = orderedEnabledSlots(seedMovie, seedSlots);
    const canonicalGaps = buildCanonicalGapClips(seedMovie, seedSlots);

    for (const gap of canonicalGaps) {
      const outputPath = path.join(process.cwd(), "public", gap.url);
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
