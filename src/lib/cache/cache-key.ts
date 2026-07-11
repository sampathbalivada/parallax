import { ViewerProfile } from "../types";

export function buildCacheKey(input: {
  movieId: string;
  slotId: string;
  profile: ViewerProfile;
  manifestVersion: number;
  promptVersion: number;
  modelName: string;
}): string {
  const profileFingerprint = [
    input.profile.city.trim().toLowerCase(),
    input.profile.country.trim().toLowerCase(),
    input.profile.locale.trim().toLowerCase(),
    ...(input.profile.culturalContext ?? []).map(v => v.trim().toLowerCase())
  ].join("|");

  return [
    input.movieId,
    input.slotId,
    profileFingerprint,
    `manifest-${input.manifestVersion}`,
    `prompt-${input.promptVersion}`,
    input.modelName
  ].join(":");
}
