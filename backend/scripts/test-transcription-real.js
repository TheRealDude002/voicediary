// scripts/test-transcription-real.js
//
// Real transcription test — uses your actual OPENAI_API_KEY and GEMINI_API_KEY
// to transcribe a small synthetic WAV file end-to-end.
//
// Skips automatically if either key looks like a stub.
//
// Run:  node scripts/test-transcription-real.js

import { config } from "../src/config/env.js";

if (
  !config.openai.apiKey ||
  config.openai.apiKey === "sk-stub" ||
  config.openai.apiKey.startsWith("sk-stub")
) {
  console.log("[skip] OPENAI_API_KEY is not set — skipping real transcription test");
  console.log("       To run this test, set real keys in .env and re-run.");
  process.exit(0);
}

if (
  !config.gemini.apiKey ||
  config.gemini.apiKey === "stub"
) {
  console.log("[skip] GEMINI_API_KEY is not set — skipping real transcription test");
  process.exit(0);
}

import { transcribeAudio } from "../src/services/transcription-service.js";

// Generate a WAV with actual spoken content — we synthesize a simple
// sine wave "blip" pattern that Whisper will recognize as audio (not silence).
// Note: Whisper needs real speech to produce a meaningful transcript, but
// this test at least proves the end-to-end HTTP flow works.
function toneWav(durationSec = 1.0, freq = 440) {
  const sampleRate = 16000;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  // Write a 440Hz tone (not silent — Whisper should at least not error)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const amp = Math.sin(2 * Math.PI * freq * t);
    const val = Math.floor(amp * 16000);
    buf.writeInt16LE(val, 44 + i * 2);
  }
  return buf;
}

console.log("[real-test] calling Whisper with synthetic audio...\n");

try {
  const result = await transcribeAudio(
    toneWav(2.0),
    "audio/wav",
    "test-tone.wav"
  );

  console.log("[real-test] RESULT:");
  console.log("  provider:", result.provider);
  console.log("  transcript:", JSON.stringify(result.transcript).slice(0, 100));
  console.log("  language:", result.language);
  console.log("  wordTimestamps:", result.wordTimestamps.length, "words");
  if (result.wordTimestamps[0]) {
    console.log("  first word:", result.wordTimestamps[0]);
  }
  console.log("\n[real-test] PASSED — transcription succeeded");
} catch (err) {
  console.error("\n[real-test] FAILED:", err.message);
  if (err.code) console.error("  code:", err.code);
  if (err.status) console.error("  status:", err.status);
  process.exit(1);
}
