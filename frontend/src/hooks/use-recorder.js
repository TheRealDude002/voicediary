// VoiceDiary recorder hook — mirrors src/hooks/use-recorder.ts.
//
// The original Next.js version used the Web Audio API (MediaRecorder).
// In Expo we use `expo-av`'s Audio.Recorder, which exposes a similar
// async API (start/stop/pause/resume) and writes to a file URI instead
// of an in-memory Blob.
//
// Public surface is preserved: status, durationSec, audioBlob (now a
// { uri, size } object), audioUrl, mimeType, error, analyser (always
// null — RN has no AnalyserNode), start, pause, resume, stop, reset.

import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native"

export const RecorderStatus = {
  IDLE: "idle",
  RECORDING: "recording",
  PAUSED: "paused",
};

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
      // Request microphone permission
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

      const ext = "m4a";
      const filename = `vd_rec_${Date.now()}.${ext}`;
      const path = `${FileSystem.documentDirectory}${filename}`;
      fileUriRef.current = path;

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
      setMimeType(Platform.OS === "web" ? "audio/webm" : "audio/m4a");
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

    const uri = fileUriRef.current || (await rec.getURI());
    let size = 0;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info?.exists) size = info.size;
    } catch {
      /* ignore */
    }

    const totalSec = Math.max(1, Math.round(accumulatedMsRef.current / 1000));
    const finalMime = mimeType || "audio/m4a";
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
    if (audioUrl) {
      try {
        await FileSystem.deleteAsync(audioUrl, { idempotent: true });
      } catch {
        /* ignore */
      }
    }
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
