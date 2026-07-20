// src/utils/jwt.js
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId.toString() }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

export function signRefreshToken(userId) {
  return jwt.sign({ sub: userId.toString(), typ: "refresh" }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
}
