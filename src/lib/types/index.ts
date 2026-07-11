export interface Movie {
  id: string;
  title: string;
  description: string;
  durationSeconds: number;
  canonicalVideoUrl: string;
  posterUrl?: string;
  manifestVersion: number;
  promptVersion: number;
  status: "draft" | "ready" | "archived";
  createdAt: string;
  updatedAt: string;
}

export type SlotType =
  | "CITY_ESTABLISHING"
  | "LOCALIZED_PROP"
  | "DIEGETIC_SCREEN";

export interface AdaptiveSlot {
  id: string;
  movieId: string;
  label: string;
  type: SlotType;

  startSeconds: number;
  endSeconds: number;
  generationLeadSeconds: number;
  generationDeadlineSeconds: number;

  narrativePurpose: string;

  editableFields: string[];
  immutableFacts: string[];
  prohibitedChanges: string[];

  visualConstraints: {
    preserveDuration: boolean;
    preserveCameraMotion: boolean;
    preserveLighting: boolean;
    preserveCharacters: boolean;
    preserveForegroundObjects: boolean;
    maxProminence?: number;
  };

  supportedLocales: string[];

  canonicalFallbackUrl: string;
  referenceImageUrls?: string[];
  referenceVideoUrl?: string;

  generationStrategy:
    | "IMAGE_THEN_VIDEO"
    | "VIDEO_EDIT"
    | "IMAGE_COMPOSITE"
    | "PREGENERATED_ONLY";

  isEnabled: boolean;
}

export interface ViewerProfile {
  id: string;
  displayName: string;
  city: string;
  country: string;
  locale: string;
  languageLabel: string;
  culturalContext?: string[];

  accessibility?: {
    highContrastText?: boolean;
    simplifiedVisualClues?: boolean;
  };
}

export type GenerationJobStatus =
  | "QUEUED"
  | "GENERATING_IMAGE"
  | "IMAGE_READY"
  | "GENERATING_VIDEO"
  | "VALIDATING"
  | "READY"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export interface ValidationResult {
  fileExists: boolean;
  durationValid: boolean;
  aspectRatioValid: boolean;
  requiredFactsPresent: boolean;
  prohibitedElementsAbsent: boolean;
  languageMatch: boolean;
  locationMatch: boolean;
  modelReviewSummary?: string;
  passed: boolean;
}

export interface GenerationJob {
  id: string;
  movieId: string;
  slotId: string;
  profileId?: string;
  profileSnapshot: ViewerProfile;

  status: GenerationJobStatus;

  cacheKey: string;
  modelImage?: string;
  modelVideo?: string;

  imagePrompt?: string;
  videoPrompt?: string;

  imageAssetUrl?: string;
  videoAssetUrl?: string;

  startedAt?: string;
  completedAt?: string;
  failureReason?: string;

  validation?: ValidationResult;
  approved: boolean;
}

export interface CacheEntry {
  id: string;
  cacheKey: string;
  movieId: string;
  slotId: string;
  assetUrl: string;
  assetType: "IMAGE" | "VIDEO";
  profileFingerprint: string;
  modelName: string;
  modelVersion?: string;
  manifestVersion: number;
  promptVersion: number;
  validationPassed: boolean;
  approved: boolean;
  createdAt: string;
  lastAccessedAt: string;
}

export interface PlaybackSegment {
  id: string;
  type: "CANONICAL" | "ADAPTIVE";
  slotId?: string;
  label?: string;
  timelineStartSeconds: number;
  timelineEndSeconds: number;
  assetUrl: string;
  assetStartSeconds: number;
  expectedDurationSeconds: number;
  source: "CANONICAL_GAP" | "FALLBACK_CLIP" | "GENERATED_CLIP";
  canonicalUrl?: string;
  personalizedUrl?: string;
  status: "READY" | "GENERATING" | "FALLBACK" | "FAILED";
}

export interface PlaybackManifest {
  movieId: string;
  durationSeconds: number;
  preparedAt: string;
  segments: PlaybackSegment[];
}
