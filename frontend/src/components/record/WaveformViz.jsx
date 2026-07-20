// VoiceDiary WaveformViz — React Native port of src/components/record/WaveformViz.tsx.
// The original was driven by an AnalyserNode from MediaRecorder; expo-av
// has no AnalyserNode, so we render a faux waveform that animates with a
// CSS-like keyframe while recording is active. Bars fall back to a static
// baseline when paused.

import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { cn } from "@/lib/utils";

export function WaveformViz({
  analyser: _analyser,
  active = true,
  bars = 28,
  className,
}) {
  const [heights, setHeights] = useState(() =>
    Array.from({ length: bars }, () => 0.2)
  );
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) clearInterval(rafRef.current);
      // Leave bars at their last frame — looks natural when paused.
      return;
    }
    // Simulate the AnalyserNode's byte-frequency pattern.
    rafRef.current = setInterval(() => {
      const next = [];
      for (let i = 0; i < bars; i++) {
        const base = 0.15 + Math.random() * 0.7 * (active ? 1 : 0.3);
        next.push(Math.max(0.1, Math.min(1, base)));
      }
      setHeights(next);
    }, 90);
    return () => {
      if (rafRef.current) clearInterval(rafRef.current);
    };
  }, [active, bars]);

  return (
    <View
      className={cn("flex flex-row items-center justify-center gap-0.5 h-16", className)}
    >
      {heights.map((h, i) => (
        <View
          key={i}
          className={cn(
            "w-1.5 rounded-full",
            active ? "bg-primary" : "bg-primary/40"
          )}
          style={{
            height: Math.max(8, h * 56),
          }}
        />
      ))}
    </View>
  );
}
