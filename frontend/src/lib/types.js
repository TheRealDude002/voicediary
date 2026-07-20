// VoiceDiary shared types — runtime-only JS port of src/lib/types.ts.
// All TS interfaces have been removed; the shapes are documented as JSDoc
// comments for readability but not enforced.

/**
 * @typedef {Object} WordTimestamp
 * @property {string} word
 * @property {number} start  // seconds
 * @property {number} end    // seconds
 */

/**
 * @typedef {Object} Entry
 * @property {string} id
 * @property {string} userId
 * @property {string} audioUrl
 * @property {string} audioPublicId
 * @property {number} duration
 * @property {string|null} transcript
 * @property {WordTimestamp[]|null} wordTimestamps
 * @property {string|null} language
 * @property {string[]} tags
 * @property {string|null} mood
 * @property {"pending"|"processing"|"done"|"failed"} transcriptionStatus
 * @property {string|null} transcriptionError
 * @property {string} createdAt  // ISO
 * @property {string} updatedAt  // ISO
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} displayName
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export const TranscriptionStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  DONE: "done",
  FAILED: "failed",
};

export default {};
