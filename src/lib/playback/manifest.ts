import type { AdaptiveSlot, GenerationJob, Movie, PlaybackManifest, PlaybackSegment } from "../types";

type BuildPlaybackManifestInput = {
  movie: Movie;
  slots: AdaptiveSlot[];
  jobs: GenerationJob[];
  preparedAt?: string;
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

export function buildPlaybackManifest({
  movie,
  slots,
  jobs,
  preparedAt = new Date().toISOString(),
}: BuildPlaybackManifestInput): PlaybackManifest {
  const orderedSlots = slots
    .filter((slot) => slot.movieId === movie.id && slot.isEnabled)
    .toSorted((a, b) => a.startSeconds - b.startSeconds);

  const segments: PlaybackSegment[] = [];
  let cursor = 0;

  orderedSlots.forEach((slot, index) => {
    assertValidSlot(slot, movie, orderedSlots[index - 1]);

    if (slot.startSeconds > cursor + EPSILON_SECONDS) {
      segments.push({
        id: `canonical-${segments.length}`,
        type: "CANONICAL",
        timelineStartSeconds: cursor,
        timelineEndSeconds: slot.startSeconds,
        assetUrl: movie.canonicalVideoUrl,
        assetStartSeconds: cursor,
        expectedDurationSeconds: slot.startSeconds - cursor,
        source: "CANONICAL_FULL",
        canonicalUrl: movie.canonicalVideoUrl,
        status: "READY",
      });
    }

    const job = jobForSlot(jobs, slot.id);
    const hasGeneratedAsset = job?.status === "READY" && Boolean(job.videoAssetUrl);
    const status = hasGeneratedAsset ? "READY" : job?.status === "FAILED" ? "FAILED" : job ? "GENERATING" : "FALLBACK";
    const assetUrl = hasGeneratedAsset ? job.videoAssetUrl! : slot.canonicalFallbackUrl;

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
    segments.push({
      id: "canonical-end",
      type: "CANONICAL",
      timelineStartSeconds: cursor,
      timelineEndSeconds: movie.durationSeconds,
      assetUrl: movie.canonicalVideoUrl,
      assetStartSeconds: cursor,
      expectedDurationSeconds: movie.durationSeconds - cursor,
      source: "CANONICAL_FULL",
      canonicalUrl: movie.canonicalVideoUrl,
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
