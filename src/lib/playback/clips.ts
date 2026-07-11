import type { AdaptiveSlot, Movie } from "../types";

export type CanonicalGapClip = {
  id: string;
  url: string;
  startSeconds: number;
  endSeconds: number;
};

const EPSILON_SECONDS = 0.001;
export const MSE_PLAYBACK_MIME_TYPE = 'video/mp4; codecs="avc1.64001f, mp4a.40.2"';

export function orderedEnabledSlots(movie: Movie, slots: AdaptiveSlot[]) {
  return slots
    .filter((slot) => slot.movieId === movie.id && slot.isEnabled)
    .toSorted((a, b) => a.startSeconds - b.startSeconds);
}

export function canonicalGapClipUrl(index: number) {
  return `/media/canonical-gaps/canonical-gap-${String(index).padStart(3, "0")}.mp4`;
}

export function playbackFragmentUrl(assetUrl: string) {
  const relativePath = assetUrl.startsWith("/media/") ? assetUrl.slice("/media/".length) : assetUrl.replace(/^\/+/, "");
  return `/media/playback-fragments/${relativePath}`;
}

export function buildCanonicalGapClips(movie: Movie, slots: AdaptiveSlot[]) {
  const orderedSlots = orderedEnabledSlots(movie, slots);
  const clips: CanonicalGapClip[] = [];
  let cursor = 0;

  orderedSlots.forEach((slot) => {
    if (slot.startSeconds > cursor + EPSILON_SECONDS) {
      clips.push({
        id: `canonical-gap-${String(clips.length).padStart(3, "0")}`,
        url: canonicalGapClipUrl(clips.length),
        startSeconds: cursor,
        endSeconds: slot.startSeconds,
      });
    }

    cursor = slot.endSeconds;
  });

  if (cursor < movie.durationSeconds - EPSILON_SECONDS) {
    clips.push({
      id: `canonical-gap-${String(clips.length).padStart(3, "0")}`,
      url: canonicalGapClipUrl(clips.length),
      startSeconds: cursor,
      endSeconds: movie.durationSeconds,
    });
  }

  return clips;
}
