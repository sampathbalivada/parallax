import { CacheEntry } from "../types";

// In-memory cache store for the hackathon
const cacheStore: Map<string, CacheEntry> = new Map();

export const CacheRepository = {
  get: async (cacheKey: string): Promise<CacheEntry | null> => {
    return cacheStore.get(cacheKey) || null;
  },
  
  set: async (entry: CacheEntry): Promise<void> => {
    cacheStore.set(entry.cacheKey, entry);
  },

  getAll: async (): Promise<CacheEntry[]> => {
    return Array.from(cacheStore.values());
  },

  clear: async (): Promise<void> => {
    cacheStore.clear();
  }
};
