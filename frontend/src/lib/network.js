// src/lib/network.js
//
// Network online/offline detection for React Native.
//
// Uses NetInfo (must be installed: `nativewind` already pulls it in
// transitively, but we add it explicitly to be safe).
//
// Exposes:
//   - useOnline()    hook returning a boolean
//   - isOnline()     synchronous read of the current state
//   - subscribe(fn)  callback fires on every change; returns unsubscribe

import { useEffect, useState } from "react";

// Lazy-load NetInfo so the module doesn't crash if the package isn't
// installed yet (e.g. during initial bootstrap before `npm install`).
let NetInfo = null;
let currentState = true; // assume online until proven otherwise
const listeners = new Set();

async function loadNetInfo() {
  if (NetInfo) return NetInfo;
  try {
    NetInfo = await import("@react-native-community/netinfo");
    return NetInfo;
  } catch (err) {
    console.warn("[network] NetInfo not available, assuming online:", err.message);
    return null;
  }
}

let initialized = false;
async function init() {
  if (initialized) return;
  initialized = true;
  const mod = await loadNetInfo();
  if (!mod) return;

  try {
    const state = await mod.fetch();
    currentState = Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    currentState = true;
  }

  mod.addEventListener((state) => {
    const next = Boolean(state.isConnected && state.isInternetReachable !== false);
    if (next !== currentState) {
      currentState = next;
      listeners.forEach((fn) => {
        try { fn(next); } catch {}
      });
    }
  });
}

// Kick off init immediately (idempotent)
init().catch(() => {});

export function isOnline() {
  return currentState;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useOnline() {
  const [online, setOnline] = useState(currentState);
  useEffect(() => {
    setOnline(currentState);
    const unsub = subscribe(setOnline);
    // Re-check on mount (in case init hadn't completed when the hook ran)
    loadNetInfo().then(async (mod) => {
      if (!mod) return;
      try {
        const s = await mod.fetch();
        const next = Boolean(s.isConnected && s.isInternetReachable !== false);
        if (next !== currentState) {
          currentState = next;
          setOnline(next);
          listeners.forEach((fn) => {
            try { fn(next); } catch {}
          });
        }
      } catch {}
    });
    return unsub;
  }, []);
  return online;
}
