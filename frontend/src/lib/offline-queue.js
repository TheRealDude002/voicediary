// src/lib/offline-queue.js
//
// Persistent offline queue for entries that failed to upload.
//
// When the user records an entry while offline (or when the upload fails
// due to a network error), the audio file URI + metadata are saved to
// AsyncStorage. A background poller retries pending uploads every 30s
// when the network comes back online.
//
// Queue entry shape:
//   {
//     id:           string (uuid),
//     fileUri:      string (FileSystem URI of the local audio file),
//     mimeType:     string,
//     duration:     number,
//     mood:         string | null,
//     tags:         string[],
//     createdAt:    ISO string,
//     attempts:     number,
//     lastError:    string | null,
//   }
//
// Status reporting:
//   - The store exposes `pendingCount` via a subscribe API so the UI
//     can show "3 entries queued for upload".
//   - Individual entries are surfaced in the entry list with
//     transcriptionStatus: 'queued' so the user sees them with a badge.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { entryApi } from "./api-client";
import { isOnline, subscribe as subscribeToNetwork } from "./network";

const QUEUE_KEY = "vd:offline-queue";
const POLL_INTERVAL_MS = 30 * 1000;

let queue = [];
let initialized = false;
const listeners = new Set();
let pollTimer = null;

function emit() {
  listeners.forEach((fn) => {
    try { fn(queue); } catch {}
  });
}

async function persist() {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function load() {
  if (initialized) return;
  initialized = true;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    queue = raw ? JSON.parse(raw) : [];
  } catch {
    queue = [];
  }
  emit();
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export function getQueue() {
  return queue;
}

export function getPendingCount() {
  return queue.length;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Enqueue a recording for upload. The audio file URI is saved so we can
 * retry even after the app restarts.
 */
export async function enqueue({ fileUri, mimeType, duration, mood, tags }) {
  await load();
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileUri,
    mimeType,
    duration,
    mood: mood ?? null,
    tags: tags ?? [],
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
  queue.push(item);
  await persist();
  emit();
  // Try uploading immediately if online
  void processQueue();
  return item;
}

/**
 * Remove an item from the queue (e.g. after successful upload or user
 * cancel).
 */
export async function remove(id) {
  await load();
  queue = queue.filter((q) => q.id !== id);
  await persist();
  emit();
}

/**
 * Try uploading every queued item. Runs automatically on network change
 * and on a 30s poll while online.
 */
export async function processQueue() {
  await load();
  if (queue.length === 0) return;
  if (!isOnline()) return;

  // Process sequentially to avoid hammering the server
  for (const item of [...queue]) {
    try {
      const entry = await entryApi.create({
        fileUri: item.fileUri,
        mimeType: item.mimeType,
        duration: item.duration,
        mood: item.mood,
        tags: item.tags,
      });

      // Success — remove from queue and notify
      queue = queue.filter((q) => q.id !== item.id);
      await persist();
      emit();

      // Notify any listeners that care about the newly-created entry
      pendingUploadListeners.forEach((fn) => {
        try { fn({ item, entry }); } catch {}
      });
    } catch (err) {
      // Bump attempt count; keep in queue
      const idx = queue.findIndex((q) => q.id === item.id);
      if (idx >= 0) {
        queue[idx] = {
          ...queue[idx],
          attempts: queue[idx].attempts + 1,
          lastError: err instanceof Error ? err.message : String(err),
        };
        await persist();
        emit();
      }

      // If the error is NOT a network error, give up after 5 attempts
      const isNetwork =
        err?.code === "network_error" || err?.status === 0;
      if (!isNetwork && queue[idx]?.attempts >= 5) {
        queue = queue.filter((q) => q.id !== item.id);
        await persist();
        emit();
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Subscribe to "entry uploaded" events (so the entry store can add the
// newly-created entry to the in-memory list)
// ─────────────────────────────────────────────────────────────

const pendingUploadListeners = new Set();
export function onUploadComplete(fn) {
  pendingUploadListeners.add(fn);
  return () => pendingUploadListeners.delete(fn);
}

// ─────────────────────────────────────────────────────────────
// Background poller
// ─────────────────────────────────────────────────────────────

export function startPoller() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    if (isOnline() && queue.length > 0) {
      void processQueue();
    }
  }, POLL_INTERVAL_MS);

  // Also process immediately when network reconnects
  subscribeToNetwork((online) => {
    if (online) {
      // Wait a moment for the network to stabilize
      setTimeout(() => void processQueue(), 1500);
    }
  });
}

export function stopPoller() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// Auto-load on module import
load().catch(() => {});
