// src/services/cloudinary-service.js
// Audio upload + delete. Audio is stored as a Cloudinary "video" asset
// (Cloudinary treats audio as a sub-type of video) and returned as a
// secure URL the mobile app can stream.

import { cloudinary } from "../config/cloudinary.js";
import { config } from "../config/env.js";
import { Readable } from "stream";
import { AppError, payloadTooLarge } from "../utils/errors.js";

/**
 * Upload an audio file from a Node Buffer or Readable stream.
 * @param {Buffer|Readable} source
 * @param {object} opts
 * @param {string} opts.userId - Used to namespace the public_id
 * @param {string} opts.filename - Used to derive the public_id
 * @param {string} opts.mimeType - e.g. "audio/m4a"
 * @returns {Promise<{url: string, publicId: string, bytes: number, durationSec: number}>}
 */
export function uploadAudio(source, { userId, filename, mimeType }) {
  return new Promise((resolve, reject) => {
    const publicId = `${config.cloudinary.audioFolder}/${userId}/${filename}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video", // Cloudinary treats audio as video
        public_id: publicId,
        overwrite: true,
        // Don't generate derived transformations — we just want raw storage
        format: undefined,
        type: "upload",
      },
      (err, result) => {
        if (err) {
          return reject(
            new AppError(
              `Cloudinary upload failed: ${err.message}`,
              502,
              "cloudinary_upload_failed"
            )
          );
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          // Cloudinary returns duration in seconds for video assets
          durationSec: typeof result.duration === "number"
            ? Math.round(result.duration)
            : 0,
        });
      }
    );

    if (Buffer.isBuffer(source)) {
      uploadStream.end(source);
    } else {
      source.pipe(uploadStream);
    }
  });
}

/**
 * Delete an audio asset from Cloudinary.
 * Idempotent — returns ok:true even if the asset was already gone.
 */
export async function deleteAudio(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
    });
    return { ok: true };
  } catch (err) {
    // Don't throw — entry deletion should still succeed even if Cloudinary
    // fails to delete the asset.
    console.warn(`[cloudinary] failed to delete ${publicId}:`, err.message);
    return { ok: false, error: err.message };
  }
}
