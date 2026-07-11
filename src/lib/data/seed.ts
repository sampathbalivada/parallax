import { ViewerProfile, Movie, AdaptiveSlot } from "@/lib/types";

export const seedProfiles: ViewerProfile[] = [
  {
    "id": "bengaluru-kn-in-srikant",
    "displayName": "Srikant",
    "city": "Bengaluru",
    "country": "India",
    "locale": "kn-IN",
    "languageLabel": "Kannada",
    "culturalContext": [
      "Silicon valley of India"
    ],
    "accessibility": {
      "highContrastText": false,
      "simplifiedVisualClues": false
    }
  },
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
  "id": "billboards-1783764076569",
  "title": "Billboards",
  "description": "What if Ad Campaigns were dynamic?",
  "durationSeconds": 53.345,
  "canonicalVideoUrl": "/media/uploads/billboards-1783764076569/billboards-1783764076569.mp4",
  "manifestVersion": 1,
  "promptVersion": 1,
  "status": "draft",
  "createdAt": "2026-07-11T10:01:16.805Z",
  "updatedAt": "2026-07-11T10:01:16.805Z"
};

export const seedMovies: Movie[] = [
  {
    "id": "billboards-1783764076569",
    "title": "Billboards",
    "description": "What if Ad Campaigns were dynamic?",
    "durationSeconds": 53.345,
    "canonicalVideoUrl": "/media/uploads/billboards-1783764076569/billboards-1783764076569.mp4",
    "manifestVersion": 1,
    "promptVersion": 1,
    "status": "draft",
    "createdAt": "2026-07-11T10:01:16.805Z",
    "updatedAt": "2026-07-11T10:01:16.805Z"
  },
  {
    "id": "hotel-mystery-001",
    "title": "Dhurandhar",
    "description": "Ishq Jalakar",
    "durationSeconds": 33,
    "canonicalVideoUrl": "/media/canonical-full.mp4",
    "manifestVersion": 1,
    "promptVersion": 1,
    "status": "ready",
    "createdAt": "2026-07-11T07:03:58.779Z",
    "updatedAt": "2026-07-11T07:03:58.779Z"
  }
];

export const seedSlots: AdaptiveSlot[] = [
  {
    "id": "slot-custom-1783764413824",
    "movieId": "billboards-1783764076569",
    "label": "Billboard 2",
    "type": "LOCALIZED_PROP",
    "startSeconds": 9.495,
    "endSeconds": 13.41,
    "generationLeadSeconds": 30,
    "generationDeadlineSeconds": 5,
    "narrativePurpose": "A billboard that is left intentionally blank to fill in ad campaigns",
    "editableFields": [
      "the billboard"
    ],
    "immutableFacts": [
      "rest of the scene",
      "colour grading",
      "field"
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
    "canonicalFallbackUrl": "/media/fallbacks/slot-custom-1783764413824-generic.mp4",
    "generationStrategy": "IMAGE_THEN_VIDEO",
    "isEnabled": true
  },
  {
    "id": "slot-custom-1783764299331",
    "movieId": "billboards-1783764076569",
    "label": "Billboard 1",
    "type": "ADSPOT_BILLBOARD",
    "startSeconds": 0,
    "endSeconds": 4.514,
    "generationLeadSeconds": 30,
    "generationDeadlineSeconds": 5,
    "narrativePurpose": "An open billboard spot to advertise or convey a media campaign.",
    "editableFields": [
      "the billboard"
    ],
    "immutableFacts": [
      "rest of the scene",
      "colour grading",
      "field"
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
    "canonicalFallbackUrl": "/media/fallbacks/slot-custom-1783764299331-generic.mp4",
    "generationStrategy": "IMAGE_THEN_VIDEO",
    "isEnabled": true
  },
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
