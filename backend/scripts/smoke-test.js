// scripts/smoke-test.js
//
// End-to-end smoke test that exercises the entire API surface.
// Requires a running server (npm run dev) and a valid .env.
//
// Run:  node scripts/smoke-test.js
//
// Generates a tiny silent WAV file in-memory so we can test the upload
// path without needing a real audio sample on disk.

import fs from "fs";
import path from "path";
import FormData from "form-data";
import { config } from "../src/config/env.js";

const BASE = `http://localhost:${config.port}`;

// Generate a 1-second silent 16kHz mono WAV (32KB) — small enough to
// pass Whisper's minimum duration check (Whisper rejects <0.1s).
function silentWav(durationSec = 1.0) {
  const sampleRate = 16000;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2; // 16-bit samples
  const buf = Buffer.alloc(44 + dataSize);

  // RIFF header
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  // samples are already zero (silent)
  return buf;
}

async function main() {
  console.log(`\n[smoke] target: ${BASE}\n`);

  // 1. Health
  let r = await fetch(`${BASE}/api/health`);
  console.log("[1] health:", r.status, await r.json());

  // 2. Register (use unique email so re-runs work)
  const email = `smoke+${Date.now()}@voicediary.test`;
  const password = "testpassword123";
  const displayName = "Smoke Test";

  r = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });
  const regBody = await r.json();
  console.log("[2] register:", r.status, {
    userId: regBody.user?.id,
    hasAccess: !!regBody.accessToken,
  });
  if (!r.ok) throw new Error(`register failed: ${JSON.stringify(regBody)}`);
  let accessToken = regBody.accessToken;

  // 3. me
  r = await fetch(`${BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log("[3] me:", r.status, await r.json());

  // 4. Create entry (multipart upload)
  const form = new FormData();
  form.append("audio", silentWav(1.0), {
    filename: "smoke.wav",
    contentType: "audio/wav",
  });
  form.append("duration", "1.0");
  form.append("mood", "calm");
  form.append("tags", JSON.stringify(["test", "smoke"]));

  r = await fetch(`${BASE}/api/entries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  const createBody = await r.json();
  console.log("[4] create entry:", r.status, {
    id: createBody.entry?.id,
    status: createBody.entry?.transcriptionStatus,
    audioUrl: createBody.entry?.audioUrl?.slice(0, 50) + "...",
  });
  if (!r.ok) throw new Error(`create failed: ${JSON.stringify(createBody)}`);

  const entryId = createBody.entry.id;

  // 5. Poll transcription status (max 60s)
  let finalStatus = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    r = await fetch(
      `${BASE}/api/entries/${entryId}/transcribe-status`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const body = await r.json();
    process.stdout.write(`\r[5] poll: ${body.status}     `);
    if (body.status === "done" || body.status === "failed") {
      finalStatus = body;
      break;
    }
  }
  console.log("\n[5] final:", {
    status: finalStatus?.status,
    provider: (await r.json()).transcriptionProvider,
    transcript: finalStatus?.transcript?.slice(0, 80),
    error: finalStatus?.error,
  });

  // 6. List entries
  r = await fetch(`${BASE}/api/entries`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const listBody = await r.json();
  console.log("[6] list:", r.status, {
    count: listBody.entries?.length,
    nextCursor: listBody.nextCursor,
  });

  // 7. Search
  r = await fetch(`${BASE}/api/entries/search?q=placeholder`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const searchBody = await r.json();
  console.log("[7] search:", r.status, {
    matches: searchBody.entries?.length,
  });

  // 8. Export entry as markdown
  r = await fetch(`${BASE}/api/export/entry/${entryId}/md`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const md = await r.text();
  console.log("[8] export md:", r.status, {
    length: md.length,
    preview: md.slice(0, 60),
  });

  // 9. Update entry
  r = await fetch(`${BASE}/api/entries/${entryId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mood: "happy", tags: ["updated", "smoke"] }),
  });
  console.log("[9] update:", r.status, (await r.json()).entry?.mood);

  // 10. Delete entry
  r = await fetch(`${BASE}/api/entries/${entryId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log("[10] delete:", r.status, await r.json());

  // 11. Logout
  r = await fetch(`${BASE}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log("[11] logout:", r.status, await r.json());

  console.log("\n[smoke] ALL PASSED\n");
}

main().catch((err) => {
  console.error("\n[smoke] FAILED:", err.message);
  process.exit(1);
});
