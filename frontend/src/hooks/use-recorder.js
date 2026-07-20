// VoiceDiary recorder hook — mirrors src/hooks/use-recorder.ts.
//
// The original Next.js version used the Web Audio API (MediaRecorder).
// In Expo we use `expo-av`'s Audio.Recorder, which exposes a similar
// async API (start/stop/pause/resume) and writes to a file URI (native)
// or a Blob URL (web) instead of an in-memory Blob.
//
// Public surface is preserved: status, durationSec, audioBlob (now a
// { uri, size } object), audioUrl, mimeType, error, analyser (always
// null — RN has no AnalyserNode), start, pause, resume, stop, reset.

import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

export const RecorderStatus = {
  IDLE: "idle",
  RECORDING: "recording",
  PAUSED: "paused",
};

const IS_WEB = Platform.OS === "web";

export function useRecorder() {
  const [status, setStatus] = useState("idle");
  const [durationSec, setDurationSec] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null); // { uri, size }
  const [audioUrl, setAudioUrl] = useState(null);
  const [mimeType, setMimeType] = useState(null);
  const [error, setError] = useState(null);
  const [analyser, setAnalyser] = useState(null); // RN has no AnalyserNode

  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const accumulatedMsRef = useRef(0);
  const fileUriRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const total =
        accumulatedMsRef.current + (now - startTimeRef.current);
      setDurationSec(Math.floor(total / 1000));
    }, 250);
  }, [stopTimer]);

  const cleanupRecording = useCallback(async () => {
    if (recordingRef.current) {
      try {
        const s = await recordingRef.current.getStatusAsync();
        if (s?.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
        await recordingRef.current.unloadAsync();
      } catch {
        /* ignore */
      }
      recordingRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setDurationSec(0);
    accumulatedMsRef.current = 0;

    try {
      // On native, request mic permission + set audio mode. On web,
      // expo-av handles getUserMedia internally — no permission request
      // or audio-mode config needed (and calling them throws / no-ops).
      if (!IS_WEB) {
        const perm = await Audio.requestPermissionsAsync();
        if (!perm.granted) {
          throw new Error(
            "Microphone permission denied. Please allow mic access in your device settings."
          );
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });
      }

      // Native: pre-construct the file path so the recording lands where
      // we expect, and we can read it back later via FileSystem.
      // Web: FileSystem.documentDirectory is `null` in browsers, so the
      // pre-constructed path would become "nullvd_rec_<ts>.m4a" — a
      // garbage relative URL the api-client would later try to fetch
      // (causing the 404 you saw). expo-av creates a Blob URL internally
      // on web; we read it via rec.getURI() in stop(). So we MUST leave
      // fileUriRef null on web — that way the `fileUriRef || getURI()`
      // fallback in stop() falls through to the real Blob URL.
      const ext = IS_WEB ? "webm" : "m4a";
      const filename = `vd_rec_${Date.now()}.${ext}`;
      if (!IS_WEB) {
        fileUriRef.current = `${FileSystem.documentDirectory}${filename}`;
      } else {
        fileUriRef.current = null;
      }

      const { recording } = await Audio.Recording.createAsync(
        {
          isMeteringEnabled: true,
          android: {
            extension: ".m4a",
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: ".m4a",
            outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
            audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: "audio/webm",
            bitsPerSecond: 128000,
          },
        },
        undefined,
        false
      );

      recordingRef.current = recording;
      setMimeType(IS_WEB ? "audio/webm" : "audio/m4a");
      startTimeRef.current = Date.now();
      startTimer();
      setStatus("recording");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(msg);
      await cleanupRecording();
      setStatus("idle");
    }
  }, [cleanupRecording, startTimer]);

  const pause = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    try {
      const s = await rec.getStatusAsync();
      if (!s?.isRecording) return;
      await rec.pauseAsync();
      accumulatedMsRef.current += Date.now() - startTimeRef.current;
      stopTimer();
      setStatus("paused");
    } catch {
      /* ignore */
    }
  }, [stopTimer]);

  const resume = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    try {
      await rec.startAsync();
      startTimeRef.current = Date.now();
      startTimer();
      setStatus("recording");
    } catch {
      /* ignore */
    }
  }, [startTimer]);

  const stop = useCallback(async () => {
    const rec = recordingRef.current;
    stopTimer();
    if (!rec) {
      setStatus("idle");
      return null;
    }
    try {
      const s = await rec.getStatusAsync();
      if (s?.isRecording) {
        accumulatedMsRef.current += Date.now() - startTimeRef.current;
      }
      await rec.stopAndUnloadAsync();
    } catch {
      /* ignore */
    }

    // On web fileUriRef.current is null (set in start()), so we fall
    // through to rec.getURI() which returns the Blob URL expo-av
    // created internally — e.g. "blob:https://voicediary-taupe.vercel.app/<uuid>".
    // That URL is what the api-client will fetch() to get the real audio
    // bytes for the multipart upload.
    const uri = fileUriRef.current || (await rec.getURI());
    let size = 0;
    try {
      if (IS_WEB) {
        // FileSystem.getInfoAsync doesn't work on blob: URLs — fetch
        // the blob to read its size. (The api-client will fetch again
        // later; this small double-fetch is fine for a size probe.)
        const resp = await fetch(uri);
        const blob = await resp.blob();
        size = blob.size;
      } else {
        const info = await FileSystem.getInfoAsync(uri);
        if (info?.exists) size = info.size;
      }
    } catch {
      /* ignore */
    }

    const totalSec = Math.max(1, Math.round(accumulatedMsRef.current / 1000));
    const finalMime = mimeType || (IS_WEB ? "audio/webm" : "audio/m4a");
    const blobLike = { uri, size };

    setAudioBlob(blobLike);
    setAudioUrl(uri);
    setDurationSec(totalSec);
    setStatus("idle");

    try {
      await rec.unloadAsync();
    } catch {
      /* ignore */
    }
    recordingRef.current = null;
    return { blob: blobLike, durationSec: totalSec, mimeType: finalMime };
  }, [mimeType, stopTimer]);

  const reset = useCallback(async () => {
    stopTimer();
    await cleanupRecording();
    if (audioUrl && !IS_WEB) {
      try {
        await FileSystem.deleteAsync(audioUrl, { idempotent: true });
      } catch {
        /* ignore */
      }
    }
    // On web, audioUrl is a Blob URL. We can't revoke it from here
    // because expo-av owns it; the browser GCs Blob URLs on page
    // unload. (If we wanted eager revocation we'd capture the URL in
    // stop() and call URL.revokeObjectURL() here — left as a future
    // improvement.)
    accumulatedMsRef.current = 0;
    startTimeRef.current = 0;
    fileUriRef.current = null;
    setAudioBlob(null);
    setAudioUrl(null);
    setDurationSec(0);
    setStatus("idle");
    setError(null);
  }, [audioUrl, cleanupRecording, stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      cleanupRecording();
    };
  }, [cleanupRecording, stopTimer]);

  return {
    status,
    durationSec,
    audioBlob,
    audioUrl,
    mimeType,
    error,
    analyser,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
