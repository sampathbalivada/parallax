"use server";

import { exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs";
import { seedSlots } from "@/lib/data/seed";

const execPromise = util.promisify(exec);

export async function exportSegmentsAction() {
  const inputPath = path.join(process.cwd(), "public", "media", "canonical-full.mp4");
  const fallbackDir = path.join(process.cwd(), "public", "media", "fallbacks");
  
  if (!fs.existsSync(inputPath)) {
    throw new Error("canonical-full.mp4 not found in public/media/");
  }

  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }

  try {
    for (const slot of seedSlots) {
      const outputPath = path.join(fallbackDir, `${slot.id}-generic.mp4`);
      const duration = slot.endSeconds - slot.startSeconds;
      
      // We re-encode slightly to ensure accurate cuts regardless of keyframes
      const cmd = `ffmpeg -y -i "${inputPath}" -ss ${slot.startSeconds} -t ${duration} -c:v libx264 -preset fast -crf 23 -c:a aac "${outputPath}"`;
      
      console.log(`Exporting ${slot.id} segment from ${slot.startSeconds} to ${slot.endSeconds}...`);
      await execPromise(cmd);
    }
    return { success: true };
  } catch (error) {
    console.error("FFmpeg export failed:", error);
    return { success: false, error: String(error) };
  }
}
