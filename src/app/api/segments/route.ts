import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { AdaptiveSlot } from "@/lib/types";
import { seedProfiles, seedMovie, seedSlots } from "@/lib/data/seed";

const writeSeedFile = (slots: AdaptiveSlot[]) => {
  const dataFilePath = path.join(process.cwd(), "src", "lib", "data", "seed.ts");
  const newFileContent = `import { ViewerProfile, Movie, AdaptiveSlot } from "@/lib/types";

export const seedProfiles: ViewerProfile[] = ${JSON.stringify(seedProfiles, null, 2)};

export const seedMovie: Movie = ${JSON.stringify(seedMovie, null, 2)};

export const seedSlots: AdaptiveSlot[] = ${JSON.stringify(slots, null, 2)};
`;
  fs.writeFileSync(dataFilePath, newFileContent);
};

export async function POST(req: NextRequest) {
  try {
    const { movieId, startSeconds, endSeconds, label, type, narrativePurpose, editableFields, immutableFacts } = await req.json();

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
    writeSeedFile(updatedSlots);

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
    writeSeedFile(updatedSlots);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete segment:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
