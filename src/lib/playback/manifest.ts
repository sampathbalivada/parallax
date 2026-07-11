import type { AdaptiveSlot, GenerationJob, Movie, PlaybackManifest, PlaybackSegment } from "../types";
import { buildCanonicalGapClips, MSE_PLAYBACK_MIME_TYPE, orderedEnabledSlots, playbackFragmentUrl } from "./clips.ts";

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
  const variants = jobs
    .filter((job) => job.slotId === slotId)
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt || left.startedAt || 0).getTime();
      const rightTime = new Date(right.createdAt || right.startedAt || 0).getTime();
      return rightTime - leftTime;
    });

  return variants.find((job) => job.status === "READY") || variants[0];
}

function assertAssetExists(assetUrl: string, assetExists: (assetUrl: string) => boolean) {
  if (!assetExists(assetUrl)) {
    throw new Error(`Required playback asset missing: ${assetUrl}`);
  }
}

function playbackAssetFields(assetUrl: string, assetExists: (assetUrl: string) => boolean) {
  const mseAssetUrl = playbackFragmentUrl(assetUrl);
  assertAssetExists(assetUrl, assetExists);
  assertAssetExists(mseAssetUrl, assetExists);

  return {
    assetUrl,
    mseAssetUrl,
    mimeType: MSE_PLAYBACK_MIME_TYPE,
  };
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
      const playbackAsset = playbackAssetFields(canonicalGap.url, assetExists);

      segments.push({
        id: canonicalGap.id,
        type: "CANONICAL",
        timelineStartSeconds: cursor,
        timelineEndSeconds: slot.startSeconds,
        ...playbackAsset,
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
    const playbackAsset = playbackAssetFields(assetUrl, assetExists);

    segments.push({
      id: slot.id,
      slotId: slot.id,
      label: slot.label,
      type: "ADAPTIVE",
      timelineStartSeconds: slot.startSeconds,
      timelineEndSeconds: slot.endSeconds,
      ...playbackAsset,
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
    const playbackAsset = playbackAssetFields(canonicalGap.url, assetExists);

    segments.push({
      id: canonicalGap.id,
      type: "CANONICAL",
      timelineStartSeconds: cursor,
      timelineEndSeconds: movie.durationSeconds,
      ...playbackAsset,
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
