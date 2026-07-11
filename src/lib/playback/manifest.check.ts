import assert from "node:assert/strict";
import { buildPlaybackManifest } from "./manifest.ts";
import { MSE_PLAYBACK_MIME_TYPE, playbackFragmentUrl } from "./clips.ts";
import type { AdaptiveSlot, GenerationJob, Movie } from "../types/index.ts";

const movie: Movie = {
  id: "movie-1",
  title: "Test",
  description: "Test movie",
  durationSeconds: 30,
  canonicalVideoUrl: "/media/full.mp4",
  manifestVersion: 1,
  promptVersion: 1,
  status: "ready",
  createdAt: "2026-07-11T00:00:00.000Z",
  updatedAt: "2026-07-11T00:00:00.000Z",
};

const slots: AdaptiveSlot[] = [
  {
    id: "late",
    movieId: movie.id,
    label: "Late",
    type: "LOCALIZED_PROP",
    startSeconds: 20,
    endSeconds: 22,
    generationLeadSeconds: 30,
    generationDeadlineSeconds: 5,
    narrativePurpose: "Late slot",
    editableFields: [],
    immutableFacts: [],
    prohibitedChanges: [],
    visualConstraints: {
      preserveDuration: true,
      preserveCameraMotion: false,
      preserveLighting: false,
      preserveCharacters: false,
      preserveForegroundObjects: false,
    },
    supportedLocales: ["en-US"],
    canonicalFallbackUrl: "/media/fallbacks/late.mp4",
    generationStrategy: "IMAGE_THEN_VIDEO",
    isEnabled: true,
  },
  {
    id: "early",
    movieId: movie.id,
    label: "Early",
    type: "LOCALIZED_PROP",
    startSeconds: 10,
    endSeconds: 12,
    generationLeadSeconds: 30,
    generationDeadlineSeconds: 5,
    narrativePurpose: "Early slot",
    editableFields: [],
    immutableFacts: [],
    prohibitedChanges: [],
    visualConstraints: {
      preserveDuration: true,
      preserveCameraMotion: false,
      preserveLighting: false,
      preserveCharacters: false,
      preserveForegroundObjects: false,
    },
    supportedLocales: ["en-US"],
    canonicalFallbackUrl: "/media/fallbacks/early.mp4",
    generationStrategy: "IMAGE_THEN_VIDEO",
    isEnabled: true,
  },
];

const readyJob: GenerationJob = {
  id: "job-early",
  movieId: movie.id,
  slotId: "early",
  profileId: "profile-1",
  profileSnapshot: {
    id: "profile-1",
    displayName: "Profile",
    city: "City",
    country: "Country",
    locale: "en-US",
    languageLabel: "English",
  },
  status: "READY",
  cacheKey: "early-en-US",
  videoAssetUrl: "/media/generated/early.mp4",
  approved: false,
};

const existingAssets = new Set([
  "/media/canonical-gaps/canonical-gap-000.mp4",
  "/media/canonical-gaps/canonical-gap-001.mp4",
  "/media/canonical-gaps/canonical-gap-002.mp4",
  "/media/generated/early.mp4",
  "/media/fallbacks/late.mp4",
]);
for (const assetUrl of Array.from(existingAssets)) {
  existingAssets.add(playbackFragmentUrl(assetUrl));
}
const manifest = buildPlaybackManifest({
  movie,
  slots,
  jobs: [readyJob],
  preparedAt: "fixed",
  assetExists: (assetUrl) => existingAssets.has(assetUrl),
});

assert.deepEqual(
  manifest.segments.map((segment) => segment.id),
  ["canonical-gap-000", "early", "canonical-gap-001", "late", "canonical-gap-002"],
);
assert.equal(manifest.segments[0].source, "CANONICAL_GAP");
assert.equal(manifest.segments[0].assetUrl, "/media/canonical-gaps/canonical-gap-000.mp4");
assert.equal(manifest.segments[0].mseAssetUrl, "/media/playback-fragments/canonical-gaps/canonical-gap-000.mp4");
assert.equal(manifest.segments[0].mimeType, MSE_PLAYBACK_MIME_TYPE);
assert.equal(manifest.segments[0].assetStartSeconds, 0);
assert.equal(manifest.segments[1].source, "GENERATED_CLIP");
assert.equal(manifest.segments[1].assetUrl, "/media/generated/early.mp4");
assert.equal(manifest.segments[1].mseAssetUrl, "/media/playback-fragments/generated/early.mp4");
assert.equal(manifest.segments[1].assetStartSeconds, 0);
assert.equal(manifest.segments[2].source, "CANONICAL_GAP");
assert.equal(manifest.segments[2].assetUrl, "/media/canonical-gaps/canonical-gap-001.mp4");
assert.equal(manifest.segments[3].source, "FALLBACK_CLIP");
assert.equal(manifest.segments[3].assetUrl, "/media/fallbacks/late.mp4");
assert.equal(manifest.segments[4].source, "CANONICAL_GAP");
assert.equal(manifest.segments[4].assetUrl, "/media/canonical-gaps/canonical-gap-002.mp4");
assert.equal(manifest.segments[0].timelineStartSeconds, 0);
assert.equal(manifest.segments[0].timelineEndSeconds, 10);
assert.equal(manifest.segments[2].timelineStartSeconds, 12);
assert.equal(manifest.segments[2].timelineEndSeconds, 20);

assert.throws(
  () =>
    buildPlaybackManifest({
      movie,
      slots: [
        { ...slots[1], id: "overlap-a", startSeconds: 10, endSeconds: 14 },
        { ...slots[0], id: "overlap-b", startSeconds: 13, endSeconds: 16 },
      ],
      jobs: [],
      assetExists: () => true,
    }),
  /overlaps/,
);

assert.throws(
  () =>
    buildPlaybackManifest({
      movie,
      slots,
      jobs: [readyJob],
      assetExists: (assetUrl) => assetUrl !== "/media/canonical-gaps/canonical-gap-001.mp4",
    }),
  /Required playback asset missing/,
);

assert.throws(
  () =>
    buildPlaybackManifest({
      movie,
      slots,
      jobs: [readyJob],
      assetExists: (assetUrl) => assetUrl !== "/media/playback-fragments/generated/early.mp4",
    }),
  /Required playback asset missing/,
);

console.log("Playback manifest checks passed");
