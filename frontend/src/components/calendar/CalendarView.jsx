// VoiceDiary CalendarView — React Native port of src/components/calendar/CalendarView.tsx.
// Month grid with dots on dates that have entries.
// Tapping a date filters and shows entries for that day.
// Mirrors apps/mobile/src/screens/calendar/CalendarScreen.jsx.

import { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EntryCard } from "@/components/entry/EntryCard";
import { useEntryStore } from "@/stores/entry-store";
import { useUIStore } from "@/stores/ui-store";
import {
  monthMatrix,
  toISODate,
  fromISODate,
  isSameDay,
  formatFull,
  formatDuration,
} from "@/lib/format-date";
import { moodById } from "@/lib/constants";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarView() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);

  const { entries, isLoading, fetchEntries } = useEntryStore();
  const openEntry = useUIStore((s) => s.openEntry);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  // Map entries by YYYY-MM-DD for quick lookup
  const entriesByDay = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      const d = new Date(e.createdAt);
      const key = toISODate(d);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [entries]);

  // Selected-day entries
  const selectedEntries = useMemo(() => {
    if (!selectedDate) return [];
    const key = toISODate(selectedDate);
    return entriesByDay.get(key) ?? [];
  }, [selectedDate, entriesByDay]);

  const matrix = useMemo(() => monthMatrix(year, month), [year, month]);

  const prevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handlePick = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 80 }}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text className="text-xl font-semibold tracking-tight text-foreground">
          Calendar
        </Text>
        <Text className="text-sm text-muted-foreground mt-0.5">
          Browse your diary by day.
        </Text>
      </View>

      <View className="rounded-xl border border-border bg-card p-3">
        {/* Month header */}
        <View className="flex flex-row items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onPress={prevMonth}
          >
            <ChevronLeft size={16} color="rgb(60, 50, 40)" />
          </Button>
          <Text className="text-sm font-medium text-foreground">
            {MONTHS[month]} {year}
          </Text>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onPress={nextMonth}
          >
            <ChevronRight size={16} color="rgb(60, 50, 40)" />
          </Button>
        </View>

        {/* Weekday headers */}
        <View className="flex flex-row mb-1">
          {WEEKDAYS.map((d) => (
            <View
              key={d}
              className="flex-1 items-center py-1"
            >
              <Text className="text-[10px] font-medium text-muted-foreground">
                {d}
              </Text>
            </View>
          ))}
        </View>

        {/* Day grid — 6 rows of 7 */}
        {matrix.map((row, rowIdx) => (
          <View key={rowIdx} className="flex flex-row gap-1 mb-1">
            {row.map((date, idx) => {
              if (!date) {
                return <View key={idx} className="flex-1 aspect-square" />;
              }
              const key = toISODate(date);
              const dayEntries = entriesByDay.get(key) ?? [];
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isToday = isSameDay(date, today);

              return (
                <Pressable
                  key={idx}
                  onPress={() => handlePick(date)}
                  className={cn(
                    "flex-1 aspect-square rounded-md flex flex-col items-center justify-center",
                    isSelected ? "bg-primary" : "bg-transparent"
                  )}
                >
                  <Text
                    className={cn(
                      "text-xs font-medium",
                      isSelected
                        ? "text-primary-foreground"
                        : isToday
                        ? "text-primary"
                        : "text-foreground"
                    )}
                  >
                    {date.getDate()}
                  </Text>
                  {dayEntries.length > 0 && (
                    <View className="flex flex-row gap-0.5 mt-0.5">
                      {dayEntries.length <= 3 ? (
                        dayEntries.map((_, i) => (
                          <View
                            key={i}
                            className={cn(
                              "h-1 w-1 rounded-full",
                              isSelected ? "bg-primary-foreground" : "bg-primary/60"
                            )}
                          />
                        ))
                      ) : (
                        <Text
                          className={cn(
                            "text-[9px] font-medium",
                            isSelected ? "text-primary-foreground" : "text-primary"
                          )}
                        >
                          {dayEntries.length}
                        </Text>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

        {isLoading && entries.length === 0 && (
          <View className="mt-3 flex items-center justify-center">
            <Loader2 size={16} color="rgb(130, 110, 90)" className="animate-spin" />
          </View>
        )}
      </View>

      {/* Selected day entries */}
      {selectedDate && (
        <View className="flex flex-col gap-3">
          <View className="flex flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">
                {formatFull(selectedDate.toISOString()).split("·")[0].trim()}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                {selectedEntries.length === 0
                  ? "No entries on this day"
                  : `${selectedEntries.length} ${
                      selectedEntries.length === 1 ? "entry" : "entries"
                    }`}
              </Text>
            </View>
            {selectedEntries.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <Text className="text-foreground text-xs">
                  Total{" "}
                  {formatDuration(
                    selectedEntries.reduce((acc, e) => acc + e.duration, 0)
                  )}
                </Text>
              </Badge>
            )}
          </View>

          {selectedEntries.length > 0 ? (
            <View className="flex flex-col gap-3">
              {selectedEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onClick={(id) => openEntry(id)}
                />
              ))}
            </View>
          ) : (
            <View className="rounded-lg border border-dashed border-border bg-card/50 p-6 items-center">
              <Text className="text-sm text-muted-foreground text-center">
                Pick another day, or record a new entry.
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
