// src/middleware/auth.js
import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";
import { unauthorized } from "../utils/errors.js";

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(unauthorized("Missing bearer token"));

  const payload = verifyToken(token);
  if (!payload) return next(unauthorized("Invalid or expired token"));
  if (payload.typ === "refresh") {
    return next(unauthorized("Refresh token cannot be used for auth"));
  }

  try {
    const user = await User.findById(payload.sub);
    if (!user) return next(unauthorized("User not found"));
    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    next(unauthorized("Invalid token subject"));
  }
}
