import { NextRequest, NextResponse } from "next/server";
import { AdaptiveSlot } from "@/lib/types";
import { seedSlots } from "@/lib/data/seed";
import { allMovies, writeStudioSeedFile } from "@/lib/data/studio-store";

export async function POST(req: NextRequest) {
  try {
    const { movieId, startSeconds, endSeconds, label, type, narrativePurpose, editableFields, immutableFacts } = await req.json();
    const movie = allMovies().find((candidate) => candidate.id === movieId);

    if (!movie) {
      return NextResponse.json({ success: false, error: "Movie not found" }, { status: 400 });
    }

    if (!label || !type || !Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
      return NextResponse.json({ success: false, error: "Segment requires label, type, and valid start/end seconds" }, { status: 400 });
    }

    const newSlotId = `slot-custom-${Date.now()}`;
    const newSlot: AdaptiveSlot = {
      id: newSlotId,
      movieId,
      label,
      type,
      startSeconds,
      endSeconds,
      generationLeadSeconds: 30,
      generationDeadlineSeconds: 5,
      narrativePurpose,
      editableFields,
      immutableFacts,
      prohibitedChanges: [],
      visualConstraints: {
        preserveDuration: true,
        preserveCameraMotion: false,
        preserveLighting: false,
        preserveCharacters: false,
        preserveForegroundObjects: false,
      },
      supportedLocales: ["en-US", "te-IN", "ja-JP", "fr-FR"],
      canonicalFallbackUrl: `/media/fallbacks/${newSlotId}-generic.mp4`,
      generationStrategy: "IMAGE_THEN_VIDEO",
      isEnabled: true,
    };

    const updatedSlots = [newSlot, ...seedSlots];
    writeStudioSeedFile({ slots: updatedSlots });

    return NextResponse.json({ success: true, slot: newSlot });
  } catch (error) {
    console.error("Failed to add segment:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ success: false, error: "No ID provided" }, { status: 400 });
    }

    const updatedSlots = seedSlots.filter(slot => slot.id !== id);
    writeStudioSeedFile({ slots: updatedSlots });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete segment:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
