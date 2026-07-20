// scripts/test-fallback.js
//
// Verifies the Whisper→Gemini fallback logic WITHOUT needing real API keys,
// by injecting a mock fetch via the service's `setFetch()` hook.

// Stub env BEFORE any imports
process.env.OPENAI_API_KEY = "sk-stub";
process.env.GEMINI_API_KEY = "stub";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/voicediary_smoke";
process.env.JWT_SECRET = "stub";
process.env.CLOUDINARY_CLOUD_NAME = "stub";
process.env.CLOUDINARY_API_KEY = "stub";
process.env.CLOUDINARY_API_SECRET = "stub";

const { transcribeAudio, evenWordTimestamps, setFetch } = await import(
  "../src/services/transcription-service.js"
);

const calls = [];

function mockFetch(url, opts) {
  const urlStr = String(url);
  calls.push({ url: urlStr, method: opts?.method || "GET" });

  if (urlStr.includes("api.openai.com")) {
    // Simulate Whisper returning a 503
    return Promise.resolve({
      ok: false,
      status: 503,
      json: async () => ({ error: { message: "Whisper overloaded" } }),
      text: async () => '{"error":{"message":"Whisper overloaded"}}',
    });
  }

  if (urlStr.includes("generativelanguage.googleapis.com")) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "Hello world this is a test transcript." }],
            },
            finishReason: "STOP",
          },
        ],
      }),
      text: async () => "",
    });
  }

  return Promise.reject(new Error(`Unexpected URL in mock: ${urlStr}`));
}

setFetch(mockFetch);

console.log("=== Test: Whisper fails, Gemini succeeds ===\n");
const result = await transcribeAudio(
  Buffer.from("fake-audio-bytes"),
  "audio/mpeg",
  "test.mp3"
);

console.log("Provider calls made:", calls.length);
console.log("  1.", calls[0]?.url.slice(0, 60));
console.log("  2.", calls[1]?.url.slice(0, 60));
console.log("\nResult:");
console.log("  provider:", result.provider);
console.log("  transcript:", result.transcript);
console.log("  safetyNotice:", result.safetyNotice);
console.log("  wordTimestamps (raw):", result.wordTimestamps);

const pass =
  result.provider === "gemini" &&
  result.transcript === "Hello world this is a test transcript." &&
  typeof result.safetyNotice === "string" &&
  result.safetyNotice.length > 0 &&
  Array.isArray(result.wordTimestamps) &&
  result.wordTimestamps.length === 0;

console.log("\n" + (pass ? "PASS" : "FAIL") + " - Gemini fallback fired correctly (with safetyNotice)\n");

console.log("=== Test: evenWordTimestamps ===");
const ts = evenWordTimestamps("one two three four", 8);
console.log("Result:", ts);
const tsPass =
  ts.length === 4 &&
  ts[0].start === 0 && ts[0].end === 2 &&
  ts[3].start === 6 && ts[3].end === 8;
console.log(tsPass ? "PASS" : "FAIL" + " - timestamps spread evenly across duration\n");

if (!pass || !tsPass) process.exit(1);
