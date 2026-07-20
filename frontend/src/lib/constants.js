// VoiceDiary shared constants — single source of truth for tags and moods.
// Mirrors the role of `apps/mobile/src/constants/tags.js` and
// `packages/shared/schemas/entry.schema.js` from the original architecture.
//
// Every emoji from the Next.js source has been replaced with the closest
// matching icon from `lucide-react-native`. The `icon` field holds the
// component reference so views can render <Mood.icon /> directly.
// No emoji characters are rendered anywhere in the UI.

import {
  SmilePlus,
  Smile,
  Meh,
  Frown,
  Wind,
  HeartHandshake,
  Moon,
  Briefcase,
  Users,
  Heart,
  Activity,
  Plane,
  BookOpen,
  Palette,
  Wallet,
  UtensilsCrossed,
  CloudMoon,
  Quote,
  Leaf,
} from "lucide-react-native";

export const MOODS = [
  { id: "great", label: "Great", icon: SmilePlus },
  { id: "good", label: "Good", icon: Smile },
  { id: "neutral", label: "Neutral", icon: Meh },
  { id: "low", label: "Low", icon: Frown },
  { id: "anxious", label: "Anxious", icon: Wind },
  { id: "grateful", label: "Grateful", icon: HeartHandshake },
  { id: "tired", label: "Tired", icon: Moon },
];

export const MOOD_IDS = MOODS.map((m) => m.id);

export const CATEGORY_TAGS = [
  { id: "work", label: "Work", icon: Briefcase },
  { id: "family", label: "Family", icon: Users },
  { id: "friends", label: "Friends", icon: Heart },
  { id: "health", label: "Health", icon: Activity },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "learning", label: "Learning", icon: BookOpen },
  { id: "creative", label: "Creative", icon: Palette },
  { id: "money", label: "Money", icon: Wallet },
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "dream", label: "Dream", icon: CloudMoon },
  { id: "reflection", label: "Reflection", icon: Quote },
  { id: "nature", label: "Nature", icon: Leaf },
];

export const ALL_TAG_IDS = CATEGORY_TAGS.map((t) => t.id);

export const SUPPORTED_AUDIO_TYPES = [
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/ogg",
  "audio/webm",
  "audio/x-webm",
  "audio/aac",
];

export const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50MB

export function moodById(id) {
  if (!id) return null;
  return MOODS.find((m) => m.id === id) ?? null;
}

export function tagById(id) {
  return CATEGORY_TAGS.find((t) => t.id === id) ?? null;
}
