// src/config/db.js
// Mongoose connection. Singleton — reuses the cached connection across
// hot reloads in dev.

import mongoose from "mongoose";
import { config } from "./env.js";

let cached = null;

export async function connectDB() {
  if (cached && mongoose.connection.readyState >= 1) {
    return cached;
  }

  mongoose.set("strictQuery", true);

  cached = mongoose.connect(config.mongo.uri, {
    serverSelectionTimeoutMS: 10000,
    dbName: undefined, // let the URI decide
  });

  try {
    await cached;
    console.log("[db] connected to MongoDB");
  } catch (err) {
    console.error("[db] failed to connect:", err.message);
    throw err;
  }

  mongoose.connection.on("error", (err) => {
    console.error("[db] connection error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] disconnected");
  });

  return cached;
}
