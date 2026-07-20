// src/config/env.js
// Centralized env config — every other module imports from here so we
// have one source of truth and fail fast on missing vars at boot.

import dotenv from "dotenv";
dotenv.config();

function required(key) {
  const v = process.env[key];
  if (!v || !v.trim()) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return v.trim();
}

function optional(key, fallback) {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : fallback;
}

function intVar(key, fallback) {
  const v = process.env[key];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function listVar(key, fallback = []) {
  const v = process.env[key];
  if (!v || !v.trim()) return fallback;
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  port: intVar("PORT", 4000),
  nodeEnv: optional("NODE_ENV", "development"),
  isProd: optional("NODE_ENV", "development") === "production",

  cors: {
    // Allow-list of origins. '*' is rejected in production for security.
    origins: listVar("CORS_ORIGIN", [
      "http://localhost:8081",
      "http://localhost:19006",
      "http://localhost:3000",
    ]),
  },

  mongo: {
    uri: required("MONGODB_URI"),
  },

  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: optional("JWT_EXPIRES_IN", "7d"),
    refreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "30d"),
  },

  cloudinary: {
    cloudName: required("CLOUDINARY_CLOUD_NAME"),
    apiKey: required("CLOUDINARY_API_KEY"),
    apiSecret: required("CLOUDINARY_API_SECRET"),
    audioFolder: optional("CLOUDINARY_AUDIO_FOLDER", "voicediary/audio"),
  },

  // The "primary" transcriber is whatever OpenAI-compatible audio
  // transcription API you point this at. By default that's OpenAI itself,
  // but the same shape is spoken by Groq, Together, DeepInfra, etc. —
  // so swapping providers is a pure `.env` change (see OPENAI_BASE_URL
  // below). The fallback chain is: this provider → Gemini.
  openai: {
    apiKey: required("OPENAI_API_KEY"),
    // Base URL of the OpenAI-compatible API. Defaults to OpenAI; set to
    // e.g. "https://api.groq.com/openai/v1" to route through Groq instead.
    baseUrl: optional(
      "OPENAI_BASE_URL",
      "https://api.openai.com/v1"
    ),
    // Model id understood by the provider above. OpenAI: "whisper-1".
    // Groq: "whisper-large-v3" or "whisper-large-v3-turbo".
    whisperModel: optional("OPENAI_WHISPER_MODEL", "whisper-1"),
    whisperResponseFormat: optional(
      "OPENAI_WHISPER_RESPONSE_FORMAT",
      "verbose_json"
    ),
  },

  gemini: {
    apiKey: required("GEMINI_API_KEY"),
    model: optional("GEMINI_MODEL", "gemini-2.0-flash"),
  },

  uploads: {
    // 25MB hard cap — both Whisper and Gemini reject audio larger than this,
    // so accepting anything bigger would just guarantee a `failed` entry.
    maxAudioBytes: intVar("MAX_AUDIO_BYTES", 25 * 1024 * 1024),
  },
};

// Sanity log on boot
console.log("[env] loaded config:", {
  port: config.port,
  nodeEnv: config.nodeEnv,
  corsOrigins: config.cors.origins,
  mongoUri: config.mongo.uri.replace(/\/\/[^@]+@/, "//***:***@"),
  cloudinaryCloud: config.cloudinary.cloudName,
  whisperBaseUrl: config.openai.baseUrl,
  whisperModel: config.openai.whisperModel,
  geminiModel: config.gemini.model,
});
