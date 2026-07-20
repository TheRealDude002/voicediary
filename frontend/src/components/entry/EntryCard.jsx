// VoiceDiary EntryCard — React Native port of src/components/entry/EntryCard.tsx.
// Card UI for HomeScreen and SearchScreen lists.
// Shows: date, duration, mood icon, first 2 lines of transcript, tag chips.
// Mirrors apps/mobile/src/components/EntryCard.jsx.

import { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Clock, Mic } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { moodById, tagById } from "@/lib/constants";
import { formatRelative, formatDuration, formatTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";

function EntryCardInner({ entry, onClick, className }) {
  const mood = moodById(entry.mood);
  const MoodIcon = mood?.icon;
  const tags = (entry.tags ?? []).slice(0, 4);

  const statusBadge =
    entry.transcriptionStatus === "pending" ||
    entry.transcriptionStatus === "processing" ? (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-800"
      >
        <View className="flex-row items-center gap-1">
          <View className="h-1.5 w-1.5 rounded-full bg-amber-500 vd-pulse" />
          <Text className="text-amber-800 text-xs font-medium">Transcribing</Text>
        </View>
      </Badge>
    ) : entry.transcriptionStatus === "failed" ? (
      <Badge variant="destructive" className="bg-rose-100 text-rose-800">
        <Text className="text-rose-800 text-xs font-medium">Transcription failed</Text>
      </Badge>
    ) : null;

  return (
    <Pressable onPress={() => onClick?.(entry.id)}>
      <Card
        className={cn(
          "border-border bg-card p-4 gap-3 flex flex-col",
          className
        )}
      >
        <View className="flex flex-row items-start justify-between gap-3">
          <View className="flex-1 min-w-0">
            <View className="flex flex-row items-baseline gap-2">
              <Text className="text-sm font-semibold text-foreground">
                {formatRelative(entry.createdAt)}
              </Text>
              <Text className="text-muted-foreground text-xs">
                · {formatTime(entry.createdAt)}
              </Text>
            </View>
            <View className="mt-1 flex flex-row items-center gap-1.5">
              <Clock size={12} color="rgb(130, 110, 90)" />
              <Text className="text-xs text-muted-foreground">
                {formatDuration(entry.duration)}
              </Text>
              {mood && (
                <>
                  <Text className="text-muted-foreground opacity-40">·</Text>
                  <View className="flex flex-row items-center gap-1">
                    {MoodIcon && (
                      <MoodIcon size={12} color="rgb(130, 110, 90)" />
                    )}
                    <Text className="text-xs text-muted-foreground">
                      {mood.label}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
          {statusBadge}
        </View>

        <Text
          className="text-sm text-foreground/80 leading-relaxed"
          numberOfLines={2}
        >
          {entry.transcript ? (
            entry.transcript
          ) : (
            <View className="flex-row items-center gap-1.5">
              <Mic size={12} color="rgb(130, 110, 90)" />
              <Text className="text-muted-foreground italic text-sm">
                {entry.transcriptionStatus === "failed"
                  ? "Tap to retry transcription"
                  : "Transcript will appear here once ready…"}
              </Text>
            </View>
          )}
        </Text>

        {tags.length > 0 && (
          <View className="flex flex-row flex-wrap gap-1.5">
            {tags.map((t) => {
              const tag = tagById(t);
              const TagIcon = tag?.icon;
              return (
                <Badge
                  key={t}
                  variant="outline"
                  className="bg-secondary/60 border-border text-secondary-foreground"
                >
                  <View className="flex-row items-center gap-1">
                    {TagIcon && <TagIcon size={12} color="rgb(88, 70, 55)" />}
                    <Text className="text-secondary-foreground text-xs font-normal">
                      {tag?.label ?? t}
                    </Text>
                  </View>
                </Badge>
              );
            })}
          </View>
        )}
      </Card>
    </Pressable>
  );
}

export const EntryCard = memo(EntryCardInner);
