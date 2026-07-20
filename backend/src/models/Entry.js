// src/models/Entry.js
import mongoose from "mongoose";

const wordTimestampSchema = new mongoose.Schema(
  {
    word: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
  },
  { _id: false }
);

const entrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Cloudinary secure URL — what the client plays back
    audioUrl: { type: String, required: true },
    // Cloudinary public_id — needed to delete the asset later
    audioPublicId: { type: String, required: true },
    duration: { type: Number, required: true, min: 0 },
    transcript: { type: String, default: null },
    wordTimestamps: { type: [wordTimestampSchema], default: [] },
    language: { type: String, default: null },
    // Which provider produced the current transcript (for debugging)
    transcriptionProvider: {
      type: String,
      enum: ["whisper", "gemini", null],
      default: null,
    },
    // Non-null when Gemini was used (i.e. Whisper failed) and Gemini's
    // own safety filter was the active transcription path. Surfaced to
    // the client so we can show the user: "we had to run this through
    // Gemini, which applies its own safety filter — content may be
    // omitted or altered". null when Whisper was used (no filtering).
    safetyNotice: { type: String, default: null },
    tags: { type: [String], default: [] },
    mood: { type: String, default: null },
    transcriptionStatus: {
      type: String,
      enum: ["pending", "processing", "done", "failed"],
      default: "pending",
      index: true,
    },
    transcriptionError: { type: String, default: null },
  },
  { timestamps: true }
);

// Compound index for paginated list queries (user-scoped, newest-first)
entrySchema.index({ userId: 1, createdAt: -1 });

entrySchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export const Entry = mongoose.model("Entry", entrySchema);
