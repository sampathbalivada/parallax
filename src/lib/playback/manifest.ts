import type { AdaptiveSlot, GenerationJob, Movie, PlaybackManifest, PlaybackSegment } from "../types";
import { buildCanonicalGapClips, orderedEnabledSlots } from "./clips.ts";

type BuildPlaybackManifestInput = {
  movie: Movie;
  slots: AdaptiveSlot[];
  jobs: GenerationJob[];
  preparedAt?: string;
  assetExists?: (assetUrl: string) => boolean;
};

const EPSILON_SECONDS = 0.001;

function slotDuration(slot: AdaptiveSlot) {
  return slot.endSeconds - slot.startSeconds;
}

function assertValidSlot(slot: AdaptiveSlot, movie: Movie, previousSlot?: AdaptiveSlot) {
  if (slot.startSeconds < 0 || slot.endSeconds > movie.durationSeconds + EPSILON_SECONDS) {
    throw new Error(`Slot ${slot.id} is outside movie bounds`);
  }

  if (slot.startSeconds >= slot.endSeconds) {
    throw new Error(`Slot ${slot.id} has invalid timing`);
  }

  if (previousSlot && slot.startSeconds < previousSlot.endSeconds - EPSILON_SECONDS) {
    throw new Error(`Slot ${slot.id} overlaps ${previousSlot.id}`);
  }
}

function jobForSlot(jobs: GenerationJob[], slotId: string) {
  return jobs.find((job) => job.slotId === slotId);
}

function assertAssetExists(assetUrl: string, assetExists: (assetUrl: string) => boolean) {
  if (!assetExists(assetUrl)) {
    throw new Error(`Required playback asset missing: ${assetUrl}`);
  }
}

export function buildPlaybackManifest({
  movie,
  slots,
  jobs,
  preparedAt = new Date().toISOString(),
  assetExists = () => true,
}: BuildPlaybackManifestInput): PlaybackManifest {
  const orderedSlots = orderedEnabledSlots(movie, slots);
  const canonicalGaps = buildCanonicalGapClips(movie, slots);

  const segments: PlaybackSegment[] = [];
  let cursor = 0;
  let canonicalGapIndex = 0;

  orderedSlots.forEach((slot, index) => {
    assertValidSlot(slot, movie, orderedSlots[index - 1]);

    if (slot.startSeconds > cursor + EPSILON_SECONDS) {
      const canonicalGap = canonicalGaps[canonicalGapIndex];
      assertAssetExists(canonicalGap.url, assetExists);

      segments.push({
        id: canonicalGap.id,
        type: "CANONICAL",
        timelineStartSeconds: cursor,
        timelineEndSeconds: slot.startSeconds,
        assetUrl: canonicalGap.url,
        assetStartSeconds: 0,
        expectedDurationSeconds: slot.startSeconds - cursor,
        source: "CANONICAL_GAP",
        canonicalUrl: canonicalGap.url,
        status: "READY",
      });
      canonicalGapIndex++;
    }

    const job = jobForSlot(jobs, slot.id);
    const hasGeneratedAsset = job?.status === "READY" && Boolean(job.videoAssetUrl);
    const status = hasGeneratedAsset ? "READY" : job?.status === "FAILED" ? "FAILED" : job ? "GENERATING" : "FALLBACK";
    const assetUrl = hasGeneratedAsset ? job.videoAssetUrl! : slot.canonicalFallbackUrl;
    assertAssetExists(assetUrl, assetExists);

    segments.push({
      id: slot.id,
      slotId: slot.id,
      label: slot.label,
      type: "ADAPTIVE",
      timelineStartSeconds: slot.startSeconds,
      timelineEndSeconds: slot.endSeconds,
      assetUrl,
      assetStartSeconds: 0,
      expectedDurationSeconds: slotDuration(slot),
      source: hasGeneratedAsset ? "GENERATED_CLIP" : "FALLBACK_CLIP",
      canonicalUrl: slot.canonicalFallbackUrl,
      personalizedUrl: hasGeneratedAsset ? job.videoAssetUrl : undefined,
      status,
    });

    cursor = slot.endSeconds;
  });

  if (cursor < movie.durationSeconds - EPSILON_SECONDS) {
    const canonicalGap = canonicalGaps[canonicalGapIndex];
    assertAssetExists(canonicalGap.url, assetExists);

    segments.push({
      id: canonicalGap.id,
      type: "CANONICAL",
      timelineStartSeconds: cursor,
      timelineEndSeconds: movie.durationSeconds,
      assetUrl: canonicalGap.url,
      assetStartSeconds: 0,
      expectedDurationSeconds: movie.durationSeconds - cursor,
      source: "CANONICAL_GAP",
      canonicalUrl: canonicalGap.url,
      status: "READY",
    });
  }

  return {
    movieId: movie.id,
    durationSeconds: movie.durationSeconds,
    preparedAt,
    segments,
  };
}
