// src/routes/index.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import * as auth from "../controllers/auth-controller.js";
import * as entries from "../controllers/entry-controller.js";
import * as exp from "../controllers/export-controller.js";

const router = Router();

// ─── Health ─────────────────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ─── Auth ──────────────────────────────────────────────────────
router.post("/auth/register", auth.register);
router.post("/auth/login", auth.login);
router.post("/auth/logout", auth.logout);
router.post("/auth/refresh", auth.refresh);
router.get("/auth/me", requireAuth, auth.me);

// ─── Entries ──────────────────────────────────────────────────
router.get("/entries", requireAuth, entries.listEntries);
router.get("/entries/search", requireAuth, entries.searchEntries);
router.get("/entries/:id", requireAuth, entries.getEntry);
router.post(
  "/entries",
  requireAuth,
  upload.single("audio"),
  entries.createEntry
);
router.patch("/entries/:id", requireAuth, entries.updateEntry);
router.delete("/entries/:id", requireAuth, entries.deleteEntry);
router.post("/entries/:id/retranscribe", requireAuth, entries.retranscribeEntry);
router.get("/entries/:id/transcribe-status", requireAuth, exp.transcribeStatus);

// ─── Export ────────────────────────────────────────────────────
router.get("/export/entry/:id/:format", requireAuth, exp.exportEntry);
router.get("/export/bulk/:format", requireAuth, exp.exportBulk);

export default router;
