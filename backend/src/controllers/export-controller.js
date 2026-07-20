// src/controllers/export-controller.js
// PDF / Markdown / plain-text export for single entries and date ranges.
// Uses PDFKit for PDF generation (server-side, real fonts).

import PDFDocument from "pdfkit";
import { Entry } from "../models/Entry.js";
import { badRequest, notFound } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const VALID_FORMATS = ["pdf", "md", "txt"];

function escapeText(text) {
  return (text ?? "").toString();
}

function buildMarkdown(entry) {
  const lines = [];
  lines.push("---");
  lines.push(`title: VoiceDiary Entry`);
  lines.push(`date: ${entry.createdAt?.toISOString?.() ?? entry.createdAt}`);
  lines.push(`duration_seconds: ${entry.duration}`);
  if (entry.mood) lines.push(`mood: ${entry.mood}`);
  if (entry.tags?.length) lines.push(`tags: [${entry.tags.join(", ")}]`);
  lines.push("---");
  lines.push("");
  lines.push(entry.transcript || "(no transcript available)");
  lines.push("");
  return lines.join("\n");
}

function buildText(entry) {
  const lines = [];
  lines.push(`VoiceDiary Entry`);
  lines.push(`Date: ${entry.createdAt?.toISOString?.() ?? entry.createdAt}`);
  lines.push(`Duration: ${entry.duration}s`);
  if (entry.mood) lines.push(`Mood: ${entry.mood}`);
  if (entry.tags?.length) lines.push(`Tags: ${entry.tags.join(", ")}`);
  lines.push("");
  lines.push(entry.transcript || "(no transcript available)");
  return lines.join("\n");
}

function sendPdf(res, entries, filename) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(res);

  const list = Array.isArray(entries) ? entries : [entries];

  list.forEach((entry, idx) => {
    if (idx > 0) doc.addPage();

    // Header
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("VoiceDiary Entry", { align: "left" });
    doc.moveDown(0.3);

    // Metadata
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#666")
      .text(
        `Date: ${entry.createdAt?.toISOString?.() ?? entry.createdAt}   Duration: ${entry.duration}s` +
          (entry.mood ? `   Mood: ${entry.mood}` : "") +
          (entry.tags?.length ? `   Tags: ${entry.tags.join(", ")}` : "")
      );
    doc.moveDown(0.8);

    // Transcript
    doc
      .fontSize(11)
      .fillColor("#222")
      .text(entry.transcript || "(no transcript available)", {
        align: "left",
        lineGap: 4,
      });
  });

  doc.end();
}

function sendText(res, content, filename, mime) {
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(content);
}

export const exportEntry = asyncHandler(async (req, res) => {
  const format = (req.params.format || "txt").toLowerCase();
  if (!VALID_FORMATS.includes(format)) {
    throw badRequest(`Invalid format. Must be one of: ${VALID_FORMATS.join(", ")}`);
  }

  const entry = await Entry.findOne({
    _id: req.params.id,
    userId: req.userId,
  }).lean();
  if (!entry) throw notFound("Entry not found");

  const date = new Date(entry.createdAt);
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const filename = `voicediary-${stamp}.${format}`;

  if (format === "pdf") {
    return sendPdf(res, entry, filename);
  }
  if (format === "md") {
    return sendText(res, buildMarkdown(entry), filename, "text/markdown");
  }
  return sendText(res, buildText(entry), filename, "text/plain");
});

export const exportBulk = asyncHandler(async (req, res) => {
  const format = (req.params.format || "txt").toLowerCase();
  if (!VALID_FORMATS.includes(format)) {
    throw badRequest(`Invalid format. Must be one of: ${VALID_FORMATS.join(", ")}`);
  }

  const { fromDate, toDate } = req.query;
  const filter = { userId: req.userId };
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const entries = await Entry.find(filter).sort({ createdAt: 1 }).lean();
  if (entries.length === 0) {
    throw notFound("No entries found in the given date range");
  }

  const filename = `voicediary-bulk-${fromDate || "start"}-to-${toDate || "now"}.${format}`;

  if (format === "pdf") {
    return sendPdf(res, entries, filename);
  }
  if (format === "md") {
    const content = entries.map(buildMarkdown).join("\n\n---\n\n");
    return sendText(res, content, filename, "text/markdown");
  }
  const content = entries.map(buildText).join("\n\n----------\n\n");
  return sendText(res, content, filename, "text/plain");
});

export const transcribeStatus = asyncHandler(async (req, res) => {
  const entry = await Entry.findOne({
    _id: req.params.id,
    userId: req.userId,
  }).select("transcriptionStatus transcriptionError transcript");
  if (!entry) throw notFound("Entry not found");

  res.json({
    id: req.params.id,
    status: entry.transcriptionStatus,
    error: entry.transcriptionError,
    transcript: entry.transcript,
  });
});
