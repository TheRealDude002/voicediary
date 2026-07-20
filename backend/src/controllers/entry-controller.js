// src/controllers/entry-controller.js
//
// Entry CRUD + transcription lifecycle:
//   create  -> uploads audio to Cloudinary, persists entry as `pending`,
//               kicks off transcription in-process (non-blocking)
//   list    -> cursor pagination (mirrors the original API surface)
//   get     -> single entry
//   update  -> tags + mood only (transcript edits are out of scope)
//   delete  -> removes entry + deletes Cloudinary asset
//   search  -> case-insensitive substring match on transcript
//   retranscribe -> re-runs the transcription pipeline on existing audio

import { Entry } from "../models/Entry.js";
import { uploadAudio, deleteAudio } from "../services/cloudinary-service.js";
import {
  transcribeAudio,
  evenWordTimestamps,
} from "../services/transcription-service.js";
import { config } from "../config/env.js";
import {
  AppError,
  badRequest,
  notFound,
  payloadTooLarge,
} from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const DEFAULT_PAGE_SIZE = 20;

function extFromMime(mime) {
  if (!mime) return "bin";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac"))
    return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  return "bin";
}

function serializeEntry(entry) {
  if (!entry) return null;
  const o = entry.toJSON();
  return {
    id: o.id,
    userId: o.userId?.toString?.() ?? o.userId,
    audioUrl: o.audioUrl,
    audioPublicId: o.audioPublicId,
    duration: o.duration,
    transcript: o.transcript ?? null,
    wordTimestamps: o.wordTimestamps ?? [],
    language: o.language ?? null,
    transcriptionProvider: o.transcriptionProvider ?? null,
    safetyNotice: o.safetyNotice ?? null,
    tags: o.tags ?? [],
    mood: o.mood ?? null,
    transcriptionStatus: o.transcriptionStatus,
    transcriptionError: o.transcriptionError ?? null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

// Non-blocking transcription — runs after the response is sent.
async function runTranscription(entryId, opts) {
  try {
    const result = await transcribeAudio(
      opts.audioBuffer,
      opts.mimeType,
      opts.filename
    );

    // Gemini doesn't return word timestamps; synthesize even ones from
    // the entry duration so the UI's karaoke still works.
    let wordTimestamps = result.wordTimestamps;
    if (
      (!wordTimestamps || wordTimestamps.length === 0) &&
      result.transcript &&
      opts.duration
    ) {
      wordTimestamps = evenWordTimestamps(result.transcript, opts.duration);
    }

    await Entry.findByIdAndUpdate(entryId, {
      transcript: result.transcript,
      wordTimestamps,
      language: result.language,
      transcriptionProvider: result.provider,
      safetyNotice: result.safetyNotice ?? null,
      transcriptionStatus: "done",
      transcriptionError: null,
    });
    console.log(
      `[transcribe] entry ${entryId} done via ${result.provider} (${wordTimestamps.length} words)` +
        (result.safetyNotice ? " [with safety notice]" : "")
    );
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Unknown error";
    await Entry.findByIdAndUpdate(entryId, {
      transcriptionStatus: "failed",
      transcriptionError: message,
    });
    console.error(
      `[transcribe] entry ${entryId} failed: ${err.code || "error"}: ${message}`
    );
  }
}

// ────────────────────────────────────────────────────────────────
// CRUD
// ────────────────────────────────────────────────────────────────

export const listEntries = asyncHandler(async (req, res) => {
  const { cursor, limit: limitStr, fromDate, toDate, tags: tagsStr } = req.query;
  const limit = Math.min(
    Math.max(parseInt(limitStr, 10) || DEFAULT_PAGE_SIZE, 1),
    100
  );

  const filter = { userId: req.userId };

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  if (tagsStr) {
    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    if (tags.length) filter.tags = { $all: tags };
  }

  if (cursor) {
    const cursorEntry = await Entry.findOne({
      _id: cursor,
      userId: req.userId,
    }).select("createdAt");
    if (cursorEntry) {
      filter.createdAt = {
        ...(filter.createdAt || {}),
        $lt: cursorEntry.createdAt,
      };
    }
  }

  const rows = await Entry.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1]._id.toString() : null;

  res.json({
    entries: page.map(serializeEntry),
    nextCursor,
  });
});

export const getEntry = asyncHandler(async (req, res) => {
  const entry = await Entry.findOne({
    _id: req.params.id,
    userId: req.userId,
  });
  if (!entry) throw notFound("Entry not found");
  res.json({ entry: serializeEntry(entry) });
});

export const createEntry = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) throw badRequest("Audio file is required (multipart field 'audio')", "missing_audio");

  const duration = parseFloat(req.body?.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw badRequest("duration (seconds) must be a positive number", "invalid_duration");
  }

  if (file.size > config.uploads.maxAudioBytes) {
    throw payloadTooLarge(
      `Audio file too large (max ${Math.floor(config.uploads.maxAudioBytes / (1024 * 1024))}MB)`
    );
  }

  const tags = (() => {
    const raw = req.body?.tags;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return raw.split(",").map((t) => t.trim()).filter(Boolean);
    }
  })();

  const mood = req.body?.mood || null;
  const ext = extFromMime(file.mimetype);
  const filename = `${req.userId}_${Date.now()}.${ext}`;

  // Upload to Cloudinary
  const uploaded = await uploadAudio(file.buffer, {
    userId: req.userId.toString(),
    filename,
    mimeType: file.mimetype,
  });

  // Use the larger of (Cloudinary-detected duration, client-reported duration)
  const finalDuration = Math.max(uploaded.durationSec || 0, Math.round(duration));

  const entry = await Entry.create({
    userId: req.userId,
    audioUrl: uploaded.url,
    audioPublicId: uploaded.publicId,
    duration: finalDuration,
    transcript: null,
    wordTimestamps: [],
    language: null,
    transcriptionProvider: null,
    safetyNotice: null,
    tags,
    mood,
    transcriptionStatus: "pending",
    transcriptionError: null,
  });

  // Kick off transcription in the background (do NOT await)
  runTranscription(entry._id, {
    audioBuffer: file.buffer,
    mimeType: file.mimetype,
    filename,
    duration: finalDuration,
  }).catch((err) => {
    console.error(`[entry] transcription runner crashed:`, err);
  });

  res.status(201).json({ entry: serializeEntry(entry) });
});

export const updateEntry = asyncHandler(async (req, res) => {
  const update = {};
  if (req.body?.tags !== undefined) {
    if (!Array.isArray(req.body.tags)) {
      throw badRequest("tags must be an array");
    }
    update.tags = req.body.tags;
  }
  if (req.body?.mood !== undefined) {
    update.mood = req.body.mood || null;
  }

  const entry = await Entry.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: update },
    { new: true, runValidators: true }
  );
  if (!entry) throw notFound("Entry not found");

  res.json({ entry: serializeEntry(entry) });
});

export const deleteEntry = asyncHandler(async (req, res) => {
  const entry = await Entry.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId,
  });
  if (!entry) throw notFound("Entry not found");

  // Best-effort Cloudinary cleanup
  await deleteAudio(entry.audioPublicId);

  res.json({ ok: true });
});

export const searchEntries = asyncHandler(async (req, res) => {
  const q = (req.query.q || req.query.query || "").trim();
  const tagsStr = req.query.tags;
  const filter = { userId: req.userId };

  if (q) {
    filter.transcript = { $regex: q, $options: "i" };
  } else {
    filter.transcript = { $ne: null, $ne: "" };
  }

  if (tagsStr) {
    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    if (tags.length) filter.tags = { $all: tags };
  }

  const rows = await Entry.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({ entries: rows.map(serializeEntry), query: q });
});

export const retranscribeEntry = asyncHandler(async (req, res) => {
  const entry = await Entry.findOne({
    _id: req.params.id,
    userId: req.userId,
  });
  if (!entry) throw notFound("Entry not found");

  // Mark as processing — also clear any stale safetyNotice from a
  // previous Gemini run (the new run will set it again if Gemini is used).
  entry.transcriptionStatus = "processing";
  entry.transcriptionError = null;
  entry.safetyNotice = null;
  await entry.save();

  // Fetch the audio from Cloudinary and re-run transcription
  const audioBuffer = await fetchAudioFromCloudinary(entry.audioUrl);

  runTranscription(entry._id, {
    audioBuffer,
    mimeType: "audio/mpeg", // Cloudinary serves audio as video, fallback to mpeg
    filename: `${entry._id}.mp3`,
    duration: entry.duration,
  }).catch((err) => {
    console.error(`[retranscribe] runner crashed:`, err);
  });

  res.json({ entry: serializeEntry(entry), message: "Retranscription started" });
});

// ────────────────────────────────────────────────────────────────
// Helper — fetch audio bytes back from Cloudinary for retranscription
// ────────────────────────────────────────────────────────────────

import fetch from "node-fetch";

async function fetchAudioFromCloudinary(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new AppError(
      `Failed to fetch audio from Cloudinary: ${res.status}`,
      502,
      "audio_fetch_failed"
    );
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
