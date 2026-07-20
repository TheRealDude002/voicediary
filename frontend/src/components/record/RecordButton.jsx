// VoiceDiary RecordButton — React Native port of src/components/record/RecordButton.tsx.
// Three states: idle (press to record), recording (pulsing red, press to pause),
// paused (press to resume). Mirrors apps/mobile/src/components/RecordButton.jsx.

import { View, Pressable, Text } from "react-native";
import { Mic, Pause, Play, Square } from "lucide-react-native";
import { cn } from "@/lib/utils";

export function RecordButton({
  status,
  onRecord,
  onPause,
  onResume,
  onStop,
  disabled,
  size = "lg",
}) {
  const dim = size === "lg" ? "h-20 w-20" : "h-14 w-14";

  // Big primary button
  if (status === "idle") {
    return (
      <Pressable
        onPress={onRecord}
        disabled={disabled}
        accessibilityLabel="Start recording"
        className={cn(
          "relative items-center justify-center rounded-full",
          "bg-primary",
          "disabled:opacity-50",
          dim
        )}
      >
        <Mic size={28} color="rgb(250, 246, 238)" />
        <View className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
      </Pressable>
    );
  }

  if (status === "recording") {
    return (
      <View className="flex flex-row items-center gap-3">
        <Pressable
          onPress={onStop}
          accessibilityLabel="Stop recording"
          className={cn(
            "items-center justify-center rounded-full",
            "bg-rose-600",
            "vd-pulse",
            dim
          )}
        >
          <Square size={28} color="#ffffff" fill="#ffffff" />
        </Pressable>
        <Pressable
          onPress={onPause}
          accessibilityLabel="Pause recording"
          className={cn(
            "items-center justify-center rounded-full",
            "bg-secondary border border-border",
            "h-12 w-12"
          )}
        >
          <Pause size={20} color="rgb(88, 70, 55)" />
        </Pressable>
      </View>
    );
  }

  // paused
  return (
    <View className="flex flex-row items-center gap-3">
      <Pressable
        onPress={onStop}
        accessibilityLabel="Stop recording"
        className={cn(
          "items-center justify-center rounded-full",
          "bg-rose-600",
          dim
        )}
      >
        <Square size={28} color="#ffffff" fill="#ffffff" />
      </Pressable>
      <Pressable
        onPress={onResume}
        accessibilityLabel="Resume recording"
        className={cn(
          "items-center justify-center rounded-full",
          "bg-primary",
          "h-12 w-12"
        )}
      >
        <Play size={20} color="rgb(250, 246, 238)" />
      </Pressable>
    </View>
  );
}
