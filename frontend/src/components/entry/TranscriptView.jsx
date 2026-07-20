// VoiceDiary TranscriptView — React Native port of src/components/entry/TranscriptView.tsx.
// Renders transcript word by word. Props: wordTimestamps, activeWordIndex.
// Active word highlighted. ScrollView with ref auto-scrolls to active word.
// Falls back to plain paragraph if no timestamps.
// Mirrors apps/mobile/src/components/TranscriptView.jsx.

import { useEffect, useRef } from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { cn } from "@/lib/utils";

export function TranscriptView({
  transcript,
  wordTimestamps,
  activeWordIndex = -1,
  className,
  editable = false,
  onChange,
}) {
  const activeRef = useRef(null);
  const scrollRef = useRef(null);

  // Auto-scroll active word into view
  useEffect(() => {
    if (activeWordIndex < 0 || !activeRef.current) return;
    try {
      activeRef.current.measureLayout(
        scrollRef.current,
        (_x, y, _w, h) => {
          scrollRef.current?.scrollTo?.({ y: y - 120, animated: true });
        },
        () => {}
      );
    } catch {
      /* ignore */
    }
  }, [activeWordIndex]);

  // Editable mode — plain TextInput
  if (editable) {
    return (
      <TextInput
        defaultValue={transcript}
        onChangeText={(t) => onChange?.(t)}
        multiline
        className={cn(
          "w-full min-h-[200px] rounded-md border border-input bg-background p-3",
          "text-sm leading-relaxed text-foreground",
          className
        )}
        placeholder="Transcript will appear here once transcription completes…"
        placeholderTextColor="rgb(130, 110, 90)"
        textAlignVertical="top"
      />
    );
  }

  // Word-by-word rendering (only if timestamps present)
  if (wordTimestamps && wordTimestamps.length > 0) {
    return (
      <View
        ref={scrollRef}
        className={cn("h-72 w-full rounded-md bg-secondary/30 p-4", className)}
      >
        <ScrollView className="w-full h-full" showsVerticalScrollIndicator>
          <Text className="text-sm leading-8 text-foreground/85">
            {wordTimestamps.map((w, i) => {
              const isActive = i === activeWordIndex;
              return (
                <Text
                  key={i}
                  ref={i === activeWordIndex ? activeRef : null}
                  style={{
                    backgroundColor: isActive ? "rgba(178, 92, 70, 0.2)" : "transparent",
                    color: isActive ? "rgb(178, 92, 70)" : "rgba(60, 50, 40, 0.85)",
                    fontWeight: isActive ? "600" : "400",
                    borderRadius: 2,
                    paddingHorizontal: 2,
                  }}
                >
                  {w.word}{" "}
                </Text>
              );
            })}
          </Text>
        </ScrollView>
      </View>
    );
  }

  // Plain paragraph fallback
  return (
    <View
      className={cn(
        "h-72 w-full rounded-md bg-secondary/30 p-4",
        className
      )}
    >
      <ScrollView className="w-full h-full" showsVerticalScrollIndicator>
        <Text className="text-sm leading-relaxed text-foreground/85">
          {transcript || (
            <Text className="text-muted-foreground italic">
              No transcript available yet.
            </Text>
          )}
        </Text>
      </ScrollView>
    </View>
  );
}
