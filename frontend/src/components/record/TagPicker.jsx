// VoiceDiary TagPicker — React Native port of src/components/record/TagPicker.tsx.
// Multi-select grid of category tag chips. Each emoji from the original
// has been replaced with the corresponding Lucide icon from constants.js.
// Mirrors apps/mobile/src/components/TagPicker.jsx.

import { View, Text, Pressable } from "react-native";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_TAGS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function TagPicker({ selected, onChange, className }) {
  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((t) => t !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <View
      className={cn("flex flex-row flex-wrap gap-2", className)}
      accessibilityRole="group"
      accessibilityLabel="Entry tags"
    >
      {CATEGORY_TAGS.map((tag) => {
        const Icon = tag.icon;
        const isOn = selected.includes(tag.id);
        return (
          <Pressable
            key={tag.id}
            onPress={() => toggle(tag.id)}
            className={cn(
              "px-3 py-1.5 rounded-full border flex-row items-center gap-1.5",
              isOn
                ? "bg-primary border-primary"
                : "bg-card border-border"
            )}
            accessibilityRole="button"
            accessibilityState={{ selected: isOn }}
          >
            <Icon
              size={14}
              color={isOn ? "rgb(250, 246, 238)" : "rgb(130, 110, 90)"}
            />
            <Text
              className={cn(
                "text-sm font-medium",
                isOn ? "text-primary-foreground" : "text-card-foreground"
              )}
            >
              {tag.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Compact variant for inline editing (smaller chips, fewer columns)
export function TagPickerBadge({ selected, onChange, className }) {
  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((t) => t !== id));
    } else {
      onChange([...selected, id]);
    }
  };
  return (
    <View className={cn("flex flex-row flex-wrap gap-1.5", className)}>
      {CATEGORY_TAGS.map((tag) => {
        const Icon = tag.icon;
        const isOn = selected.includes(tag.id);
        return (
          <Pressable key={tag.id} onPress={() => toggle(tag.id)}>
            <Badge
              variant={isOn ? "default" : "outline"}
              className={cn(
                "select-none text-xs",
                isOn
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              <View className="flex-row items-center gap-1">
                <Icon
                  size={12}
                  color={isOn ? "rgb(250, 246, 238)" : "rgb(130, 110, 90)"}
                />
                <Text
                  className={cn(
                    "text-xs",
                    isOn ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  {tag.label}
                </Text>
              </View>
            </Badge>
          </Pressable>
        );
      })}
    </View>
  );
}
