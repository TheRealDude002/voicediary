// src/utils/asyncHandler.js
// Wraps an async controller so thrown errors get forwarded to Express's
// error handler instead of crashing the process.

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
