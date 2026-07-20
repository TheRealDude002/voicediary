// VoiceDiary AudioPlayer — React Native port of src/components/entry/AudioPlayer.tsx.
// Wraps expo-av's Audio.Sound. Props: audioUrl (file:// URI), wordTimestamps,
// onPositionChange. Renders play/pause button, progress bar with seek,
// duration display. Fires onPositionChange(ms) every 100ms during playback.
// Mirrors apps/mobile/src/components/AudioPlayer.jsx.

import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Audio } from "expo-av";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/format-date";
import { cn } from "@/lib/utils";

export function AudioPlayer({
  audioUrl,
  wordTimestamps,
  onPositionChange,
  className,
}) {
  const soundRef = useRef(null);
  const intervalRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Position reporting loop (replaces requestAnimationFrame in the web version)
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    let lastReport = 0;
    intervalRef.current = setInterval(async () => {
      const sound = soundRef.current;
      if (!sound) return;
      try {
        const s = await sound.getStatusAsync();
        if (s?.isLoaded) {
          const ms = Math.floor((s.positionMillis ?? 0));
          setCurrentMs(ms);
          const now = Date.now();
          if (now - lastReport >= 100) {
            onPositionChange?.(ms);
            lastReport = now;
          }
        }
      } catch {
        /* ignore */
      }
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, onPositionChange]);

  // Load the sound on mount / when audioUrl changes
  useEffect(() => {
    let mounted = true;
    setIsReady(false);
    setCurrentMs(0);
    setDurationSec(0);

    async function loadSound() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false, progressUpdateIntervalMillis: 100 },
          (status) => {
            if (!mounted) return;
            if (status.isLoaded) {
              if (status.durationMillis && status.durationMillis > 0) {
                setDurationSec(status.durationMillis / 1000);
              }
              setIsReady(true);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setCurrentMs(0);
                onPositionChange?.(0);
              }
            }
          }
        );
        soundRef.current = sound;
      } catch {
        setIsReady(false);
      }
    }

    if (audioUrl) loadSound();

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [audioUrl, onPositionChange]);

  const togglePlay = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch {
      /* ignore */
    }
  }, [isPlaying]);

  const seekBy = useCallback(async (deltaSec) => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      const s = await sound.getStatusAsync();
      if (!s?.isLoaded) return;
      const newPos = Math.max(0, Math.min((s.durationMillis ?? 0), s.positionMillis + deltaSec * 1000));
      await sound.setPositionAsync(newPos);
      setCurrentMs(newPos);
    } catch {
      /* ignore */
    }
  }, []);

  const handleSeek = useCallback(async (val) => {
    const sound = soundRef.current;
    if (!sound || !durationSec) return;
    const targetMs = (val[0] / 100) * durationSec * 1000;
    await sound.setPositionAsync(targetMs);
    setCurrentMs(targetMs);
  }, [durationSec]);

  const progressPct = durationSec > 0
    ? Math.min(100, (currentMs / 1000 / durationSec) * 100)
    : 0;

  // Find current word index based on position
  const activeWordIdx = (() => {
    if (!wordTimestamps?.length) return -1;
    const sec = currentMs / 1000;
    let idx = -1;
    for (let i = 0; i < wordTimestamps.length; i++) {
      if (sec >= wordTimestamps[i].start) idx = i;
      else break;
    }
    return idx;
  })();

  return (
    <View
      className={cn(
        "rounded-lg bg-secondary/40 border border-border p-3",
        className
      )}
    >
      <View className="flex flex-row items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onPress={() => seekBy(-5)}
          disabled={!isReady}
        >
          <RotateCcw size={16} color="rgb(60, 50, 40)" />
        </Button>

        <Pressable
          onPress={togglePlay}
          disabled={!isReady}
          className={cn(
            "h-11 w-11 shrink-0 rounded-full bg-primary items-center justify-center",
            !isReady && "opacity-50"
          )}
        >
          {isPlaying ? (
            <Pause size={20} color="rgb(250, 246, 238)" />
          ) : (
            <Play size={20} color="rgb(250, 246, 238)" style={{ marginLeft: 2 }} />
          )}
        </Pressable>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onPress={() => seekBy(5)}
          disabled={!isReady}
        >
          <RotateCw size={16} color="rgb(60, 50, 40)" />
        </Button>

        <View className="flex-1 min-w-0">
          <Slider
            value={[progressPct]}
            max={100}
            step={0.1}
            onValueChange={handleSeek}
            disabled={!isReady}
          />
          <View className="mt-1 flex flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground tabular-nums">
              {formatDuration(currentMs / 1000)}
            </Text>
            <Text className="text-xs text-muted-foreground tabular-nums">
              {formatDuration(durationSec)}
            </Text>
          </View>
        </View>
      </View>

      {wordTimestamps && wordTimestamps.length > 0 && (
        <Text className="mt-2 text-[10px] text-muted-foreground">
          Word {activeWordIdx + 1} / {wordTimestamps.length}
        </Text>
      )}
    </View>
  );
}
