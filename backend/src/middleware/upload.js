// src/middleware/upload.js
// Multer config — audio files arrive as multipart/form-data. We keep
// them in memory (no disk writes) and forward to Cloudinary.

import multer from "multer";
import { config } from "../config/env.js";

const ALLOWED_MIME = [
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
  "audio/mp3",
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.uploads.maxAudioBytes,
    // Limit overall form fields
    fieldSize: 1024 * 1024,
    fields: 20,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error(`Unsupported audio type: ${file.mimetype}`));
  },
});
