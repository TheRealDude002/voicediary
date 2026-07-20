// src/utils/errors.js
// Custom error classes that carry an HTTP status + machine-readable code.
// Controllers throw these; the global error handler turns them into JSON.

export class AppError extends Error {
  constructor(message, status = 500, code = "internal_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const unauthorized = (msg = "Authentication required") =>
  new AppError(msg, 401, "auth_required");

export const forbidden = (msg = "Forbidden") =>
  new AppError(msg, 403, "forbidden");

export const notFound = (msg = "Not found") =>
  new AppError(msg, 404, "not_found");

export const badRequest = (msg = "Bad request", code = "bad_request") =>
  new AppError(msg, 400, code);

export const conflict = (msg = "Conflict", code = "conflict") =>
  new AppError(msg, 409, code);

export const payloadTooLarge = (msg = "Payload too large") =>
  new AppError(msg, 413, "payload_too_large");
