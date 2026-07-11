import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";
import { playbackFragmentUrl } from "./clips.ts";

const execPromise = util.promisify(exec);

function quotePath(value: string) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

export function publicPathForAssetUrl(assetUrl: string) {
  const relativePath = assetUrl.startsWith("/") ? assetUrl.slice(1) : assetUrl;
  return path.join(process.cwd(), "public", relativePath);
}

export function publicPathForPlaybackFragment(assetUrl: string) {
  return publicPathForAssetUrl(playbackFragmentUrl(assetUrl));
}

export async function exportPlaybackFragment(inputPath: string, outputPath: string) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const videoFilter = "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=24,format=yuv420p";
  const cmd = [
    "ffmpeg",
    "-y",
    "-i",
    quotePath(inputPath),
    "-map 0:v:0",
    "-map 0:a:0?",
    "-vf",
    quotePath(videoFilter),
    "-c:v libx264",
    "-profile:v high",
    "-level 3.1",
    "-preset fast",
    "-crf 23",
    "-g 24",
    "-keyint_min 24",
    "-sc_threshold 0",
    "-c:a aac",
    "-ar 48000",
    "-ac 2",
    "-movflags +frag_keyframe+empty_moov+default_base_moof",
    quotePath(outputPath),
  ].join(" ");

  await execPromise(cmd);
}

export async function exportPlaybackFragmentForAsset(assetUrl: string) {
  const inputPath = publicPathForAssetUrl(assetUrl);
  const outputPath = publicPathForPlaybackFragment(assetUrl);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Playback fragment source missing: ${assetUrl}`);
  }

  await exportPlaybackFragment(inputPath, outputPath);
  return playbackFragmentUrl(assetUrl);
}
