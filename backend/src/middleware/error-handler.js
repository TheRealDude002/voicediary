// src/middleware/error-handler.js
import { AppError } from "../utils/errors.js";

// 404 handler — no route matched
export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "route_not_found"));
}

// Final error handler — turns thrown AppErrors (and generic Errors) into
// a consistent JSON envelope: { error: { message, code, status } }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const code = err.code || "internal_error";

  if (status >= 500) {
    console.error(`[error] ${status} ${code}:`, err.stack || err.message);
  } else {
    console.warn(`[error] ${status} ${code}: ${err.message}`);
  }

  // Multer errors (file too large, etc.) — translate to our envelope
  let finalErr = err;
  if (err.code === "LIMIT_FILE_SIZE") {
    finalErr = new AppError(
      `Audio file too large (max ${Math.floor(req.app.locals?.maxAudioBytes / (1024 * 1024) || 25)}MB)`,
      413,
      "audio_too_large"
    );
  }

  res.status(finalErr.status || 500).json({
    error: {
      message: finalErr.message,
      code: finalErr.code || "internal_error",
      status: finalErr.status || 500,
    },
  });
}
