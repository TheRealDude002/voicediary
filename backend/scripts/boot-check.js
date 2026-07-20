// scripts/boot-check.js
// Verifies that every module in the backend imports cleanly.
// Does NOT connect to Mongo, does NOT listen on a port.
//
// Run:  node scripts/boot-check.js

import { config } from "../src/config/env.js";
console.log("[boot] env loaded:", { port: config.port, model: config.openai.whisperModel });

import { connectDB } from "../src/config/db.js";
console.log("[boot] db module OK");

import { cloudinary } from "../src/config/cloudinary.js";
console.log("[boot] cloudinary module OK:", cloudinary.config().cloud_name);

import { User } from "../src/models/User.js";
import { Entry } from "../src/models/Entry.js";
console.log("[boot] models OK:", User.modelName, Entry.modelName);

import { signAccessToken, verifyToken } from "../src/utils/jwt.js";
const t = signAccessToken("507f1f77bcf86cd799439011");
console.log("[boot] jwt OK, token length:", t.length);

import { AppError, unauthorized, notFound } from "../src/utils/errors.js";
console.log("[boot] errors OK:", new AppError("x", 400, "x").code);

import { uploadAudio, deleteAudio } from "../src/services/cloudinary-service.js";
import { transcribeAudio, evenWordTimestamps } from "../src/services/transcription-service.js";
console.log("[boot] services OK:", typeof uploadAudio, typeof transcribeAudio, typeof evenWordTimestamps);

import { requireAuth } from "../src/middleware/auth.js";
import { notFoundHandler, errorHandler } from "../src/middleware/error-handler.js";
import { upload } from "../src/middleware/upload.js";
console.log("[boot] middleware OK:", typeof requireAuth, typeof upload.single);

import * as authC from "../src/controllers/auth-controller.js";
import * as entryC from "../src/controllers/entry-controller.js";
import * as expC from "../src/controllers/export-controller.js";
console.log("[boot] controllers OK:", Object.keys(authC).length, Object.keys(entryC).length, Object.keys(expC).length);

import routes from "../src/routes/index.js";
console.log("[boot] routes OK, stack length:", routes.stack.length);

import express from "express";
const app = express();
app.use("/api", routes);
console.log("[boot] express mounted routes OK");

console.log("\n[boot] ALL MODULES LOADED CLEANLY\n");
