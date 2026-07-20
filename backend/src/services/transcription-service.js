// src/services/transcription-service.js
//
// Two-tier transcription:
//   1. PRIMARY  — Any OpenAI-compatible Whisper API. By default OpenAI's
//                 `whisper-1`, but can be repointed to Groq / Together /
//                 DeepInfra / etc. purely via env (see OPENAI_BASE_URL).
//   2. FALLBACK — Google Gemini (gemini-2.0-flash by default) on ANY
//                 primary error (4xx, 5xx, timeout, network, parse, etc.)
//
// Both providers are called via plain HTTPS (no SDK), using `node-fetch`
// which works in both Node 18+ and older runtimes.
//
// Returns: { transcript, wordTimestamps, language, provider, safetyNotice }
//   - wordTimestamps: [{ word, start, end }, ...] in seconds
//   - provider: "whisper" | "gemini"
//   - safetyNotice: null when Whisper (or any OpenAI-compatible) was used;
//       a human-readable disclosure string when Gemini was used (because
//       Gemini's safety filter is on by default and may omit/alter content).
//
// On total failure (both providers error), throws an AppError so the
// caller can mark the entry as `failed` and surface the message to the UI.

import FormData from "form-data";
import nodeFetch from "node-fetch";
import { config } from "../config/env.js";
import { AppError } from "../utils/errors.js";

// Pluggable fetch — defaults to node-fetch (which is compatible with the
// `form-data` package's streams). Tests can override via `setFetch()`.
let _fetch = nodeFetch;
export function setFetch(fn) {
  _fetch = fn;
}
export function getFetch() {
  return _fetch;
}

// Build the Whisper endpoint from the configured base URL so the same
// code path works for OpenAI, Groq, Together, etc. — just change
// OPENAI_BASE_URL (and OPENAI_WHISPER_MODEL) in .env to switch providers.
const WHISPER_URL = `${config.openai.baseUrl.replace(/\/+$/, "")}/audio/transcriptions`;
const GEMINI_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.gemini.apiKey}`;

const FETCH_TIMEOUT_MS = 120_000; // 2 min hard cap per provider

// ─────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────

/**
 * Transcribe an audio Buffer.
 *
 * Primary path (any OpenAI-compatible Whisper API — OpenAI by default,
 * Groq / Together / DeepInfra if OPENAI_BASE_URL is overridden) → returns
 *   { provider: "whisper", safetyNotice: null }
 *   (Whisper-style APIs do not apply a safety filter — the transcript is
 *   verbatim.)
 *
 * Gemini path (only on primary failure) → returns
 *   { provider: "gemini", safetyNotice: "<human-readable disclosure>" }
 *   because Gemini's own safety filter is on by default and may omit
 *   or alter content. We can't disable it.
 *
 * @param {Buffer} audioBuffer
 * @param {string} mimeType   e.g. "audio/m4a"
 * @param {string} filename   e.g. "user1_abc.m4a"
 * @returns {Promise<{transcript: string, wordTimestamps: Array, language: string|null, provider: string, safetyNotice: string|null}>}
 */
export async function transcribeAudio(audioBuffer, mimeType, filename) {
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new AppError("Empty audio buffer", 400, "empty_audio");
  }

  // Tier 1: Whisper — no safety filter, verbatim transcript.
  try {
    const result = await transcribeWithWhisper(audioBuffer, mimeType, filename);
    return { ...result, provider: "whisper", safetyNotice: null };
  } catch (whisperErr) {
    console.warn(
      `[transcribe] Whisper failed (${whisperErr.code || "error"}): ${whisperErr.message}. Falling back to Gemini.`
    );

    // Tier 2: Gemini — fires on ANY Whisper error. Gemini's own safety
    // filter is on; we surface that to the user via safetyNotice.
    try {
      const result = await transcribeWithGemini(
        audioBuffer,
        mimeType,
        filename
      );
      return {
        ...result,
        provider: "gemini",
        safetyNotice:
          "Whisper was unavailable, so this transcript was produced by " +
          "Google Gemini. Gemini applies its own safety filter and may " +
          "have omitted or altered parts of the audio. The original " +
          "audio is unchanged.",
      };
    } catch (geminiErr) {
      console.error(
        `[transcribe] Gemini also failed (${geminiErr.code || "error"}): ${geminiErr.message}`
      );
      throw new AppError(
        `Transcription failed (whisper: ${whisperErr.message}; gemini: ${geminiErr.message})`,
        502,
        "transcription_failed"
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Tier 1: OpenAI Whisper
// ─────────────────────────────────────────────────────────────

async function transcribeWithWhisper(audioBuffer, mimeType, filename) {
  const form = new FormData();
  form.append("file", audioBuffer, {
    filename: filename || "audio",
    contentType: mimeType || "audio/mpeg",
  });
  form.append("model", config.openai.whisperModel);
  form.append("response_format", config.openai.whisperResponseFormat);

  // verbose_json is the only format that returns word timestamps
  if (config.openai.whisperResponseFormat === "verbose_json") {
    // `timestamp_granularities[]=word` makes Whisper return word-level
    // timestamps in the response. (API quirk: must be repeated, not joined.)
    form.append("timestamp_granularities[]", "word");
    form.append("timestamp_granularities[]", "segment");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await _fetch(WHISPER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openai.apiKey}`,
        ...form.getHeaders(),
      },
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new AppError("Whisper timeout", 504, "whisper_timeout");
    }
    throw new AppError(
      `Whisper network error: ${err.message}`,
      503,
      "whisper_network_error"
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new AppError(
      `Whisper ${res.status}: ${detail}`,
      res.status,
      `whisper_${res.status}`
    );
  }

  // Parse the response according to the requested format
  const format = config.openai.whisperResponseFormat;
  if (format === "text") {
    const transcript = (await res.text()).trim();
    return {
      transcript,
      wordTimestamps: [],
      language: null,
    };
  }

  // json / verbose_json / srt / vtt — all return JSON-ish content
  if (format === "verbose_json") {
    const body = await res.json();
    const transcript = (body.text || "").trim();
    const words = Array.isArray(body.words)
      ? body.words
          .filter((w) => typeof w.word === "string")
          .map((w) => ({
            word: w.word,
            start: typeof w.start === "number" ? +w.start.toFixed(2) : 0,
            end: typeof w.end === "number" ? +w.end.toFixed(2) : 0,
          }))
      : [];
    return {
      transcript,
      wordTimestamps: words,
      language: body.language || null,
    };
  }

  if (format === "json") {
    const body = await res.json();
    return {
      transcript: (body.text || "").trim(),
      wordTimestamps: [],
      language: body.language || null,
    };
  }

  // srt / vtt — return the raw text; no word timestamps available
  const raw = await res.text();
  return {
    transcript: raw.trim(),
    wordTimestamps: [],
    language: null,
  };
}

// ─────────────────────────────────────────────────────────────
// Tier 2: Google Gemini (fallback)
//
// Gemini accepts audio via the `inlineData` part with base64-encoded
// audio. Returns text only — no word timestamps. We synthesize even
// timestamps client-side so the UI's karaoke-style highlight still
// works (with even spacing, not real ASR timestamps).
// ─────────────────────────────────────────────────────────────

async function transcribeWithGemini(audioBuffer, mimeType, filename) {
  const base64Audio = audioBuffer.toString("base64");

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "audio/mpeg",
              data: base64Audio,
            },
          },
          {
            text: [
              "Transcribe this audio verbatim.",
              "Rules:",
              "- Output ONLY the transcribed text, no preamble, no commentary, no markdown.",
              "- Preserve the original language (do not translate).",
              "- If the audio is silent or has no speech, output the single word: [silence]",
              "- Do not wrap the result in quotes.",
            ].join(" "),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4096,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await _fetch(GEMINI_URL(config.gemini.model), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new AppError("Gemini timeout", 504, "gemini_timeout");
    }
    throw new AppError(
      `Gemini network error: ${err.message}`,
      503,
      "gemini_network_error"
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail =
        body?.error?.message || body?.error?.status || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new AppError(
      `Gemini ${res.status}: ${detail}`,
      res.status,
      `gemini_${res.status}`
    );
  }

  const data = await res.json();

  // Gemini response shape:
  //   { candidates: [{ content: { parts: [{ text: "..." }] } }] }
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const transcript = parts
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();

  if (!transcript) {
    // Gemini sometimes returns no text if the safety filter tripped or
    // the audio was empty
    const finishReason = data?.candidates?.[0]?.finishReason;
    throw new AppError(
      `Gemini returned no transcript (finishReason: ${finishReason || "unknown"})`,
      502,
      "gemini_empty"
    );
  }

  // Gemini has no native word timestamps — return empty array.
  // The controller will synthesize even-spacing timestamps from the
  // entry duration so the karaoke UI still works.
  return {
    transcript,
    wordTimestamps: [],
    language: null,
  };
}

/**
 * Synthesize evenly-spaced word timestamps when a provider didn't return
 * real ones (i.e. Gemini). Used by the controller.
 */
export function evenWordTimestamps(transcript, durationSec) {
  const words = (transcript || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || !durationSec || durationSec <= 0) return [];
  const per = durationSec / words.length;
  return words.map((word, i) => ({
    word,
    start: +(i * per).toFixed(2),
    end: +((i + 1) * per).toFixed(2),
  }));
}
