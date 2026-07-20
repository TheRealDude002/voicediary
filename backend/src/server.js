// src/server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { config } from "./config/env.js";
import { connectDB } from "./config/db.js";
import routes from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middleware/error-handler.js";

async function main() {
  // Connect to Mongo first — fail fast if it's unreachable
  await connectDB();

  const app = express();

  // Trust first proxy (so req.ip and HTTPS detection work behind Render/Railway/etc.)
  app.set("trust proxy", 1);

  // Body parsers — we use raw JSON for most routes; multipart is handled
  // per-route by multer (so no body parser for those).
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Security & infra middleware
  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow same-origin / no-origin (mobile apps, curl)
        if (!origin) return cb(null, true);
        if (config.cors.origins.includes(origin)) return cb(null, true);
        // In dev, be permissive
        if (!config.isProd && /localhost|127\.0\.0\.1|\.local$/.test(origin)) {
          return cb(null, true);
        }
        return cb(new Error(`CORS blocked origin: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(morgan(config.isProd ? "combined" : "dev"));

  // Global rate limit — protect against flood attempts
  app.use(
    rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 120, // 120 req/min/IP
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { message: "Too many requests", code: "rate_limited", status: 429 } },
    })
  );

  // Expose upload limit to the error handler (for multer's LIMIT_FILE_SIZE)
  app.locals.maxAudioBytes = config.uploads.maxAudioBytes;

  // Routes
  app.use("/api", routes);

  // 404 + error handler (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(config.port, () => {
    console.log(`\n[server] VoiceDiary backend listening on :${config.port}`);
    console.log(`[server] env: ${config.nodeEnv}`);
    console.log(`[server] CORS origins: ${config.cors.origins.join(", ") || "(permissive)"}`);
    console.log(`[server] Whisper model: ${config.openai.whisperModel}`);
    console.log(`[server] Gemini fallback model: ${config.gemini.model}\n`);
  });
}

main().catch((err) => {
  console.error("[server] fatal startup error:", err);
  process.exit(1);
});

// Graceful shutdown
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`\n[server] ${sig} received, shutting down...`);
    process.exit(0);
  });
}

// Catch unhandled errors so the process doesn't crash silently
process.on("unhandledRejection", (err) => {
  console.error("[server] unhandledRejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("[server] uncaughtException:", err);
});
