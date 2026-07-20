// VoiceDiary SearchView — React Native port of src/components/search/SearchView.tsx.
// Debounced search input + filter chips + results list.
// Mirrors apps/mobile/src/screens/search/SearchScreen.jsx.

import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Search as SearchIcon, X, Loader2 } from "lucide-react-native";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EntryCard } from "@/components/entry/EntryCard";
import { useEntryStore } from "@/stores/entry-store";
import { useUIStore } from "@/stores/ui-store";
import { CATEGORY_TAGS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SearchView() {
  const {
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    activeTagFilters,
    search,
    clearSearch,
    toggleTagFilter,
    clearTagFilters,
  } = useEntryStore();
  const openEntry = useUIStore((s) => s.openEntry);

  const [input, setInput] = useState(searchQuery);

  // Debounce search
  useEffect(() => {
    if (input === searchQuery) return;
    const t = setTimeout(() => {
      void search(input);
    }, 350);
    return () => clearTimeout(t);
  }, [input, searchQuery, search]);

  const clear = useCallback(() => {
    setInput("");
    clearSearch();
  }, [clearSearch]);

  const hasResults = searchResults && searchResults.length > 0;
  const hasSearched = searchResults !== null;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text className="text-xl font-semibold tracking-tight text-foreground">
          Search
        </Text>
        <Text className="text-sm text-muted-foreground mt-0.5">
          Find any moment in your diary.
        </Text>
      </View>

      {/* Search input */}
      <View className="relative">
        <View
          style={{
            position: "absolute",
            left: 12,
            top: 0,
            bottom: 0,
            justifyContent: "center",
            zIndex: 1,
          }}
          pointerEvents="none"
        >
          <SearchIcon size={16} color="rgb(130, 110, 90)" />
        </View>
        <Input
          value={input}
          onChangeText={setInput}
          placeholder="Search transcripts…"
          className="pl-9 pr-9 h-11"
        />
        {input ? (
          <Pressable
            onPress={clear}
            style={{
              position: "absolute",
              right: 8,
              top: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
              width: 28,
            }}
          >
            <X size={16} color="rgb(130, 110, 90)" />
          </Pressable>
        ) : null}
      </View>

      {/* Tag filter chips */}
      <View className="flex flex-row flex-wrap gap-1.5 items-center">
        {CATEGORY_TAGS.map((tag) => {
          const Icon = tag.icon;
          const active = activeTagFilters.includes(tag.id);
          return (
            <Pressable key={tag.id} onPress={() => toggleTagFilter(tag.id)}>
              <Badge
                variant={active ? "default" : "outline"}
                className={cn(
                  "select-none",
                  active ? "bg-primary" : "text-muted-foreground"
                )}
              >
                <View className="flex-row items-center gap-1">
                  <Icon
                    size={12}
                    color={active ? "rgb(250, 246, 238)" : "rgb(130, 110, 90)"}
                  />
                  <Text
                    className={cn(
                      "text-xs",
                      active ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    {tag.label}
                  </Text>
                </View>
              </Badge>
            </Pressable>
          );
        })}
        {activeTagFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onPress={clearTagFilters}
            className="h-7"
          >
            <Text className="text-muted-foreground text-xs">Clear filters</Text>
          </Button>
        )}
      </View>

      {/* Search error */}
      {searchError && (
        <View className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <Text className="text-sm text-destructive">{searchError}</Text>
        </View>
      )}

      {/* States */}
      {isSearching && (
        <View className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </View>
      )}

      {!isSearching && hasSearched && !hasResults && (
        <View className="rounded-xl border border-dashed border-border bg-card/50 p-8 items-center">
          <SearchIcon size={32} color="rgba(130, 110, 90, 0.6)" />
          <Text className="mt-3 text-sm text-muted-foreground text-center">
            No entries match "{searchQuery}"
            {activeTagFilters.length > 0 && " with these filters"}.
          </Text>
        </View>
      )}

      {!isSearching && !hasSearched && (
        <View className="rounded-xl border border-dashed border-border bg-card/50 p-8 items-center">
          <Text className="text-sm text-muted-foreground text-center">
            Type above to search across all your transcripts.
          </Text>
        </View>
      )}

      {/* Results */}
      {!isSearching && hasResults && (
        <>
          <Text className="text-xs text-muted-foreground">
            {searchResults.length}{" "}
            {searchResults.length === 1 ? "match" : "matches"} found
          </Text>
          <View className="flex flex-col gap-3">
            {searchResults.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onClick={(id) => openEntry(id)}
              />
            ))}
          </View>
        </>
      )}

      {isSearching && (
        <View className="flex justify-center items-center py-3">
          <Loader2 size={20} color="rgb(130, 110, 90)" className="animate-spin" />
        </View>
      )}
    </ScrollView>
  );
}
