import fs from "fs";
import path from "path";
import { AdaptiveSlot, Movie, ViewerProfile } from "@/lib/types";
import { seedMovie, seedMovies, seedProfiles, seedSlots } from "@/lib/data/seed";

export function allMovies() {
  return seedMovies?.length ? seedMovies : [seedMovie];
}

export function slotsForMovie(movieId: string) {
  return seedSlots.filter((slot) => slot.movieId === movieId);
}

export function writeStudioSeedFile({
  profiles = seedProfiles,
  movies = allMovies(),
  slots = seedSlots,
}: {
  profiles?: ViewerProfile[];
  movies?: Movie[];
  slots?: AdaptiveSlot[];
}) {
  const dataFilePath = path.join(process.cwd(), "src", "lib", "data", "seed.ts");
  const primaryMovie = movies[0] ?? seedMovie;
  const newFileContent = `import { ViewerProfile, Movie, AdaptiveSlot } from "@/lib/types";

export const seedProfiles: ViewerProfile[] = ${JSON.stringify(profiles, null, 2)};

export const seedMovie: Movie = ${JSON.stringify(primaryMovie, null, 2)};

export const seedMovies: Movie[] = ${JSON.stringify(movies, null, 2)};

export const seedSlots: AdaptiveSlot[] = ${JSON.stringify(slots, null, 2)};
`;
  fs.writeFileSync(dataFilePath, newFileContent);
}

export function projectIdFromTitle(title: string) {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${slug || "project"}-${Date.now()}`;
}

export function publicMediaPathFromUrl(assetUrl: string) {
  const normalized = assetUrl.startsWith("/") ? assetUrl.slice(1) : assetUrl;
  return path.join(process.cwd(), "public", normalized);
}
