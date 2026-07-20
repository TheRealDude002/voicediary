// src/controllers/auth-controller.js
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { signAccessToken, signRefreshToken, verifyToken } from "../utils/jwt.js";
import { AppError, badRequest, conflict, unauthorized } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const PASSWORD_MIN = 8;
const SALT_ROUNUNDS = 10;

function sanitizeUser(user) {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const register = asyncHandler(async (req, res) => {
  const { email, password, displayName } = req.body || {};

  if (!email || !password || !displayName) {
    throw badRequest("email, password, and displayName are required");
  }
  if (password.length < PASSWORD_MIN) {
    throw badRequest(`Password must be at least ${PASSWORD_MIN} characters`, "weak_password");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw conflict("Email already registered", "email_taken");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNUNDS);
  const user = await User.create({
    email: email.toLowerCase(),
    displayName: displayName.trim(),
    passwordHash,
  });

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  res.status(201).json({
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    throw badRequest("email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw unauthorized("Invalid email or password");
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw unauthorized("Invalid email or password");
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  res.json({
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  });
});

export const me = asyncHandler(async (req, res) => {
  // requireAuth already populated req.user
  res.json({ user: sanitizeUser(req.user) });
});

export const refresh = asyncHandler(async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  // Body takes precedence if present
  const bodyToken = req.body?.refreshToken;
  const candidate = bodyToken || token;

  const payload = verifyToken(candidate);
  if (!payload || payload.typ !== "refresh") {
    throw unauthorized("Invalid refresh token");
  }

  const user = await User.findById(payload.sub);
  if (!user) throw unauthorized("User not found");

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  res.json({ accessToken, refreshToken });
});

export const logout = asyncHandler(async (_req, res) => {
  // Stateless JWT — there's nothing to revoke server-side. The client
  // just discards the token. (For real revocation, add a Redis blacklist.)
  res.json({ ok: true });
});
