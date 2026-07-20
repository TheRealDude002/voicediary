// VoiceDiary MoodSelector — React Native port of src/components/record/MoodSelector.tsx.
// Single-select mood picker. Each emoji from the original has been
// replaced with the corresponding Lucide icon from constants.js.
// Mirrors the inline mood selector in RecordScreen and EntryDetailScreen.

import { View, Text, Pressable } from "react-native";
import { MOODS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function MoodSelector({ value, onChange, className }) {
  return (
    <View
      className={cn("flex flex-row flex-wrap gap-2", className)}
      accessibilityRole="radiogroup"
      accessibilityLabel="Mood"
    >
      {MOODS.map((mood) => {
        const Icon = mood.icon;
        const isOn = value === mood.id;
        return (
          <Pressable
            key={mood.id}
            onPress={() => onChange(isOn ? null : mood.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isOn }}
            title={mood.label}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg border px-2 py-2",
              "w-[14%] min-w-[64px]",
              isOn
                ? "bg-primary/10 border-primary"
                : "bg-card border-border"
            )}
          >
            <Icon
              size={20}
              color={isOn ? "rgb(178, 92, 70)" : "rgb(130, 110, 90)"}
            />
            <Text
              className={cn(
                "text-[10px] font-medium",
                isOn ? "text-primary" : "text-muted-foreground"
              )}
            >
              {mood.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
