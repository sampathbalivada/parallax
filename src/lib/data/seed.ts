import { ViewerProfile, Movie, AdaptiveSlot } from "@/lib/types";

export const seedProfiles: ViewerProfile[] = [
  {
    "id": "vizag-te",
    "displayName": "Sampath",
    "city": "Visakhapatnam",
    "country": "India",
    "locale": "te-IN",
    "languageLabel": "Telugu",
    "culturalContext": [
      "coastal city",
      "India"
    ],
    "accessibility": {
      "highContrastText": false,
      "simplifiedVisualClues": false
    }
  },
  {
    "id": "tokyo-ja",
    "displayName": "Aiko",
    "city": "Tokyo",
    "country": "Japan",
    "locale": "ja-JP",
    "languageLabel": "Japanese",
    "culturalContext": [
      "dense urban environment",
      "Japan"
    ],
    "accessibility": {
      "highContrastText": false,
      "simplifiedVisualClues": false
    }
  },
  {
    "id": "sf-en",
    "displayName": "Maya",
    "city": "San Francisco",
    "country": "United States",
    "locale": "en-US",
    "languageLabel": "English",
    "culturalContext": [
      "Bay Area",
      "United States"
    ],
    "accessibility": {
      "highContrastText": true,
      "simplifiedVisualClues": false
    }
  }
];

export const seedMovie: Movie = {
  "id": "hotel-mystery-001",
  "title": "The Room Across the City",
  "description": "A short film project.",
  "durationSeconds": 33,
  "canonicalVideoUrl": "/media/canonical-full.mp4",
  "manifestVersion": 1,
  "promptVersion": 1,
  "status": "ready",
  "createdAt": "2026-07-11T07:03:58.779Z",
  "updatedAt": "2026-07-11T07:03:58.779Z"
};

export const seedSlots: AdaptiveSlot[] = [
  {
    "id": "slot-custom-1783753927541",
    "movieId": "hotel-mystery-001",
    "label": "Entering the city",
    "type": "LOCALIZED_PROP",
    "startSeconds": 22.507,
    "endSeconds": 24.255,
    "generationLeadSeconds": 30,
    "generationDeadlineSeconds": 5,
    "narrativePurpose": "Spy entering the city where he is supposed to execute his operation. ",
    "editableFields": [
      "welcome board",
      "place name"
    ],
    "immutableFacts": [
      "locaiton of the scene",
      "people"
    ],
    "prohibitedChanges": [],
    "visualConstraints": {
      "preserveDuration": true,
      "preserveCameraMotion": false,
      "preserveLighting": false,
      "preserveCharacters": false,
      "preserveForegroundObjects": false
    },
    "supportedLocales": [
      "en-US",
      "te-IN",
      "ja-JP",
      "fr-FR"
    ],
    "canonicalFallbackUrl": "/media/fallbacks/slot-custom-1783753927541-generic.mp4",
    "generationStrategy": "IMAGE_THEN_VIDEO",
    "isEnabled": true
  },
  {
    "id": "slot-custom-1783753812630",
    "movieId": "hotel-mystery-001",
    "label": "Helicopter",
    "type": "LOCALIZED_PROP",
    "startSeconds": 11.966,
    "endSeconds": 13.507,
    "generationLeadSeconds": 30,
    "generationDeadlineSeconds": 5,
    "narrativePurpose": "a spy boarding a helicopter in enemy territory. ",
    "editableFields": [
      "tail number",
      "logo",
      "flag"
    ],
    "immutableFacts": [
      "rest of the scene"
    ],
    "prohibitedChanges": [],
    "visualConstraints": {
      "preserveDuration": true,
      "preserveCameraMotion": false,
      "preserveLighting": false,
      "preserveCharacters": false,
      "preserveForegroundObjects": false
    },
    "supportedLocales": [
      "en-US",
      "te-IN",
      "ja-JP",
      "fr-FR"
    ],
    "canonicalFallbackUrl": "/media/fallbacks/slot-custom-1783753812630-generic.mp4",
    "generationStrategy": "IMAGE_THEN_VIDEO",
    "isEnabled": true
  }
];
