// VoiceDiary logger — minimal port of src/lib/logger.ts.
// Replaces server-side logging with React Native's console.

export const logger = {
  info: (...args) => console.log("[VoiceDiary]", ...args),
  warn: (...args) => console.warn("[VoiceDiary]", ...args),
  error: (...args) => console.error("[VoiceDiary]", ...args),
  debug: (...args) => console.debug("[VoiceDiary]", ...args),
};

export default logger;
