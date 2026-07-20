// src/lib/api-client.js
//
// VoiceDiary API client — talks to the VoiceDiary backend over HTTP.
//
// All requests go through `apiFetch()` which:
//   - prefixes the configured API_BASE_URL
//   - injects the bearer token from cache/storage
//   - auto-refreshes the access token on 401 (using the refresh token)
//   - parses the JSON envelope `{ data }` or `{ error: { message, code, status } }`
//   - throws a typed Error with `.code` and `.status` attached
//
// Configure the backend URL via the EXPO_PUBLIC_API_URL env var
// (declared in app.json → expo.env). Falls back to localhost:4000 for dev.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

const API_BASE_URL =
  // Expo "public" env vars are inlined at build time
  (typeof process !== "undefined" && process.env && process.env.EXPO_PUBLIC_API_URL) ||
  "http://localhost:4000/api";

const TOKEN_KEY = "vd_access_token";
const REFRESH_TOKEN_KEY = "vd_refresh_token";

let cachedToken = null;
let cachedRefreshToken = null;

export function getAccessToken() {
  // The auth-store reads this synchronously during bootstrap, so we expose
  // the cached value via a module-level variable kept in sync by
  // setAccessToken().
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

// On module load, prime cached tokens from storage so the auth store
// can read them synchronously during bootstrap.
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

/**
 * Internal fetch wrapper. Returns parsed JSON on success, throws ApiError
 * on failure. Auto-refreshes on 401 once.
 */
async function apiFetch(path, { authRetry = true, ...init } = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const headers = {
    ...(init.body instanceof FormData
      ? {} // let fetch set multipart boundary
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
    // Network failure (offline, DNS, etc.) — throw with a useful code
    throw new ApiError(
      err instanceof Error ? err.message : "Network request failed",
      0,
      "network_error"
    );
  }

  // 401 → try refresh once, then retry
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

  // Empty body (e.g. 204) → return null
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
      // ignore — we'll clear local tokens anyway
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
    const filename = fileUri.split("/").pop() || `audio-${Date.now()}`;

    // Build a FormData with the audio file
    const form = new FormData();

    // On web (browser), FormData's {uri,name,type} syntax from RN doesn't
    // work — the browser can't read `uri:`. We fetch the blob URI manually
    // and attach a real File object. On native we keep the RN syntax.
       const isWeb = Platform.OS === "web";
    if (isWeb) {
      const res = await fetch(fileUri);
      const blob = await res.blob();
      const file = new File([blob], filename, {
        type: mimeType || "audio/webm",
      });
      form.append("audio", file);
    } else {
      form.append("audio", {
        uri: fileUri,
        name: filename,
        type: mimeType || "audio/m4a",
      });
    }
      form.append("audio", file);
    } else {
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
  // The server streams the file back — fetch it, save to FS cache, share.
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

  // Convert blob → base64 → file
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

// Backwards-compat — old code referenced this
export async function downloadBlob() {
  // No-op — exports go through exportEntry / exportBulk above.
}

export const __API_BASE_URL__ = API_BASE_URL;
