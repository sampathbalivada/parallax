import { NextRequest, NextResponse } from "next/server";
import { seedProfiles } from "@/lib/data/seed";
import { ViewerProfile } from "@/lib/types";
import { writeStudioSeedFile } from "@/lib/data/studio-store";

function clean(value: unknown) {
  return String(value || "").trim();
}

function slugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function parseCulturalContext(value: unknown) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const displayName = clean(body.displayName);
    const city = clean(body.city);
    const country = clean(body.country);
    const locale = clean(body.locale);
    const languageLabel = clean(body.languageLabel);
    const culturalContext = parseCulturalContext(body.culturalContext);

    if (!displayName || !city || !country || !locale || !languageLabel) {
      return NextResponse.json({ success: false, error: "Name, city, country, locale, and language are required" }, { status: 400 });
    }

    const baseId = [city, locale, displayName].map(slugPart).filter(Boolean).join("-") || `profile-${Date.now()}`;
    const id = seedProfiles.some((profile) => profile.id === baseId) ? `${baseId}-${Date.now()}` : baseId;
    const profile: ViewerProfile = {
      id,
      displayName,
      city,
      country,
      locale,
      languageLabel,
      culturalContext,
      accessibility: {
        highContrastText: false,
        simplifiedVisualClues: false,
      },
    };

    writeStudioSeedFile({ profiles: [profile, ...seedProfiles] });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Failed to create profile:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
