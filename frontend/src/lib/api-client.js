// src/lib/api-client.js
//
// VoiceDiary API client — talks to the VoiceDiary backend over HTTP.
//
// All requests go through `apiFetch()` which:
//   - prefixes the configured API_BASE_URL
//   - injects the bearer token from cache/storage
//   - auto-refreshs the access token on 401 (using the refresh token)
//   - parses the JSON envelope `{ data }` or `{ error: { message, code, status } }`
//   - throws a typed Error with `.code` and `.status` attached
//
// Configure the backend URL via the EXPO_PUBLIC_API_URL env var
// (declared in app.json → expo.env). Falls back to localhost:4000 for dev.

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

const IS_WEB = Platform.OS === "web";

const API_BASE_URL =
  (typeof process !== "undefined" && process.env && process.env.EXPO_PUBLIC_API_URL) ||
  "http://localhost:4000/api";

const TOKEN_KEY = "vd_access_token";
const REFRESH_TOKEN_KEY = "vd_refresh_token";

let cachedToken = null;
let cachedRefreshToken = null;

export function getAccessToken() {
  return cachedToken;
}

export async function setTokens(access, refresh) {
  cachedToken = access;
  cachedRefreshToken = refresh;
  if (access) await AsyncStorage.setItem(TOKEN_KEY, access);
  else await AsyncStorage.removeItem(TOKEN_KEY);
  if (refresh) await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  else await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function setAccessToken(access) {
  await setTokens(access, cachedRefreshToken);
}

(async () => {
  try {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
    cachedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    cachedToken = null;
    cachedRefreshToken = null;
  }
})();

// ─────────────────────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code || "api_error";
    this.details = details;
  }
}

async function refreshTokens() {
  if (!cachedRefreshToken) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: cachedRefreshToken }),
    });
    if (!res.ok) return false;
    const body = await res.json();
    if (!body.accessToken) return false;
    await setTokens(body.accessToken, body.refreshToken || cachedRefreshToken);
    return true;
  } catch {
    return false;
  }
}

async function apiFetch(path, { authRetry = true, ...init } = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const headers = {
    ...(init.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(init.headers || {}),
  };

  if (cachedToken) {
    headers.Authorization = `Bearer ${cachedToken}`;
  }

  let res;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Network request failed",
      0,
      "network_error"
    );
  }

  if (res.status === 401 && authRetry) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      headers.Authorization = `Bearer ${cachedToken}`;
      res = await fetch(url, { ...init, headers }).catch((err) => {
        throw new ApiError(
          err instanceof Error ? err.message : "Network request failed",
          0,
          "network_error"
        );
      });
    }
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = body?.error || {};
    throw new ApiError(
      err.message || `HTTP ${res.status}`,
      err.status || res.status,
      err.code || `http_${res.status}`,
      err.details
    );
  }

  return body;
}

// ─────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────

export const authApi = {
  register: async (data) => {
    const body = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      authRetry: false,
    });
    await setTokens(body.accessToken, body.refreshToken);
    return body;
  },

  login: async (data) => {
    const body = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
      authRetry: false,
    });
    await setTokens(body.accessToken, body.refreshToken);
    return body;
  },

  logout: async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    await setTokens(null, null);
  },

  me: () => apiFetch("/auth/me", { authRetry: false }).then((b) => b.user),

  refresh: () => apiFetch("/auth/refresh", { method: "POST", authRetry: false }),
};

// ─────────────────────────────────────────────────────────────
// Entry API
// ─────────────────────────────────────────────────────────────

export const entryApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.fromDate) qs.set("fromDate", params.fromDate);
    if (params.toDate) qs.set("toDate", params.toDate);
    if (params.tags?.length) qs.set("tags", params.tags.join(","));
    const q = qs.toString();
    return apiFetch(`/entries${q ? "?" + q : ""}`).then((b) => b);
  },

  get: (id) => apiFetch(`/entries/${id}`).then((b) => b.entry),

  create: async ({ fileUri, mimeType, duration, mood, tags }) => {
    const form = new FormData();

    if (IS_WEB) {
      // ── Web path ───────────────────────────────────────────────
      // Browsers can't use React Native's { uri, name, type } shape —
      // the browser FormData stringifies it as "[object Object]", so
      // the backend sees no actual file. We must fetch the Blob URL
      // expo-av produced and wrap it in a real File object so the
      // browser sets the multipart boundary + content-type correctly.
      const filename =
        (fileUri && fileUri.split("/").pop()) ||
        `audio-${Date.now()}.webm`;

      let blob;
      try {
        const resp = await fetch(fileUri);
        if (!resp.ok) {
          throw new ApiError(
            `Failed to read local recording (HTTP ${resp.status})`,
            0,
            "local_audio_read_failed"
          );
        }
        blob = await resp.blob();
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(
          err instanceof Error ? err.message : "Failed to read local recording",
          0,
          "local_audio_read_failed"
        );
      }

      if (!blob || blob.size === 0) {
        throw new ApiError(
          "Local recording is empty — try recording again.",
          0,
          "empty_local_audio"
        );
      }

      const file = new File([blob], filename, {
        type: mimeType || "audio/webm",
      });
      form.append("audio", file);
    } else {
      // ── Native path ────────────────────────────────────────────
      // React Native's FormData accepts the { uri, name, type } shape
      // directly — the bridge resolves the uri and streams the bytes.
      const filename =
        (fileUri && fileUri.split("/").pop()) ||
        `audio-${Date.now()}.m4a`;
      form.append("audio", {
        uri: fileUri,
        name: filename,
        type: mimeType || "audio/m4a",
      });
    }

    form.append("duration", String(duration));
    if (mood) form.append("mood", mood);
    if (tags?.length) form.append("tags", JSON.stringify(tags));

    const body = await apiFetch("/entries", {
      method: "POST",
      body: form,
    });
    return body.entry;
  },

  update: (id, data) =>
    apiFetch(`/entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }).then((b) => b.entry),

  delete: (id) => apiFetch(`/entries/${id}`, { method: "DELETE" }),

  search: async (query, tags) => {
    const qs = new URLSearchParams();
    if (query) qs.set("q", query);
    if (tags?.length) qs.set("tags", tags.join(","));
    const body = await apiFetch(`/entries/search?${qs.toString()}`);
    return body.entries;
  },

  retranscribe: (id) =>
    apiFetch(`/entries/${id}/retranscribe`, { method: "POST" }).then(
      (b) => b.entry
    ),

  transcribeStatus: (id) =>
    apiFetch(`/entries/${id}/transcribe-status`),
};

// ─────────────────────────────────────────────────────────────
// Export API
// ─────────────────────────────────────────────────────────────

export async function exportEntry(id, format) {
  const url = `${API_BASE_URL}/export/entry/${id}/${format}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cachedToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(
      `Export failed: HTTP ${res.status} ${text.slice(0, 100)}`,
      res.status,
      `export_http_${res.status}`
    );
  }

  const blob = await res.blob();
  const filename = `voicediary-${id}.${format}`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  const reader = new FileReader();
  const base64 = await new Promise((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await shareFile(fileUri, filename, mimeForFormat(format));
  return { filename };
}

export async function exportBulk(format, fromDate, toDate) {
  const qs = new URLSearchParams();
  if (fromDate) qs.set("fromDate", fromDate);
  if (toDate) qs.set("toDate", toDate);
  const url = `${API_BASE_URL}/export/bulk/${format}?${qs.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cachedToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(
      `Export failed: HTTP ${res.status} ${text.slice(0, 100)}`,
      res.status,
      `export_http_${res.status}`
    );
  }

  const blob = await res.blob();
  const filename = `voicediary-bulk.${format}`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  const reader = new FileReader();
  const base64 = await new Promise((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await shareFile(fileUri, filename, mimeForFormat(format));
  return { filename };
}

function mimeForFormat(format) {
  if (format === "pdf") return "application/pdf";
  if (format === "md") return "text/markdown";
  return "text/plain";
}

export async function shareFile(fileUri, filename, mime) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device");
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: mime,
    dialogTitle: filename,
    UTI: mime,
  });
}

export async function downloadBlob() {
  // No-op — exports go through exportEntry / exportBulk above.
}

export const __API_BASE_URL__ = API_BASE_URL;
