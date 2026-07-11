import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { Movie } from "@/lib/types";
import { allMovies, projectIdFromTitle, writeStudioSeedFile } from "@/lib/data/studio-store";
import { seedSlots } from "@/lib/data/seed";

const execFileAsync = promisify(execFile);

const safeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function readVideoDurationSeconds(filePath: string) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const durationSeconds = Number(stdout.trim());

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Could not read video duration with ffprobe");
  }

  return Number(durationSeconds.toFixed(3));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const video = formData.get("video");

    if (!title) {
      return NextResponse.json({ success: false, error: "Project title is required" }, { status: 400 });
    }

    if (!(video instanceof File) || video.size === 0) {
      return NextResponse.json({ success: false, error: "Video upload is required" }, { status: 400 });
    }

    if (!video.type.startsWith("video/")) {
      return NextResponse.json({ success: false, error: "Upload must be a video file" }, { status: 400 });
    }

    const id = projectIdFromTitle(title);
    const uploadsDir = path.join(process.cwd(), "public", "media", "uploads", id);
    fs.mkdirSync(uploadsDir, { recursive: true });

    const extension = path.extname(video.name) || ".mp4";
    const fileName = safeFileName(`${id}${extension}`);
    const filePath = path.join(uploadsDir, fileName);
    const bytes = Buffer.from(await video.arrayBuffer());
    fs.writeFileSync(filePath, bytes);
    const durationSeconds = await readVideoDurationSeconds(filePath);

    const now = new Date().toISOString();
    const movie: Movie = {
      id,
      title,
      description,
      durationSeconds,
      canonicalVideoUrl: `/media/uploads/${id}/${fileName}`,
      manifestVersion: 1,
      promptVersion: 1,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    writeStudioSeedFile({
      movies: [movie, ...allMovies()],
      slots: seedSlots,
    });

    return NextResponse.json({ success: true, movie });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
