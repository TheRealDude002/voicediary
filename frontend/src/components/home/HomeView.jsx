// VoiceDiary HomeView — React Native port of src/components/home/HomeView.tsx.
// List of EntryCard components. Pulls from entryStore.
// Mirrors apps/mobile/src/screens/home/HomeScreen.jsx.

import { useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { Loader2, Mic, Plus, RefreshCw } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EntryCard } from "@/components/entry/EntryCard";
import { useEntryStore } from "@/stores/entry-store";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useIsMobile } from "@/hooks/use-mobile";

const LOAD_MORE_THRESHOLD = 600; // px from bottom

export function HomeView() {
  const {
    entries,
    isLoading,
    isLoadingMore,
    nextCursor,
    error,
    fetchEntries,
    loadMore,
  } = useEntryStore();
  const openEntry = useUIStore((s) => s.openEntry);
  const setView = useUIStore((s) => s.setView);
  const user = useAuthStore((s) => s.user);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (entries.length === 0) void fetchEntries();
  }, [entries.length, fetchEntries]);

  // FlatList's onEndReached replaces the original IntersectionObserver sentinel.
  const handleEndReached = useCallback(() => {
    if (nextCursor && !isLoadingMore) void loadMore();
  }, [loadMore, nextCursor, isLoadingMore]);

  const header = (
    <View style={{ flexDirection: "column" }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <View className="flex-1">
          <Text className="text-xl font-semibold tracking-tight text-foreground">
            Hello, {user?.displayName?.split(/\s+/)[0] ?? "there"}
          </Text>
          <Text className="text-sm text-muted-foreground mt-0.5">
            {entries.length > 0
              ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"} in your diary`
              : "Record your first voice entry to get started"}
          </Text>
        </View>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onPress={() => fetchEntries()}
          disabled={isLoading}
        >
          <RefreshCw size={16} color="rgb(130, 110, 90)" className={isLoading ? "animate-spin" : ""} />
        </Button>
      </View>

      {error && (
        <View style={{ marginBottom: 16 }} className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <Text className="text-sm text-destructive">{error}</Text>
        </View>
      )}

      {/* Loading skeletons */}
      {isLoading && entries.length === 0 && (
        <View style={{ flexDirection: "column", gap: 12, marginBottom: 16 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </View>
      )}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <EmptyState onCreate={() => setView("record")} />
      )}
    </View>
  );

  const footer = (
    <View style={{ flexDirection: "column" }}>
      {isLoadingMore && (
        <View className="flex justify-center items-center py-3">
          <Loader2 size={20} color="rgb(130, 110, 90)" className="animate-spin" />
        </View>
      )}
      {!nextCursor && entries.length > 0 && (
        <Text className="text-center text-xs text-muted-foreground py-4">
          · · · end of entries · · ·
        </Text>
      )}
    </View>
  );

  return (
    <FlatList
  data={entries}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <EntryCard entry={item} onClick={(id) => openEntry(id)} />
  )}
  ListHeaderComponent={header}
  ListFooterComponent={footer}
  ListEmptyComponent={null}
  ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
  onEndReached={handleEndReached}
  onEndReachedThreshold={0.2}
  contentContainerStyle={{ padding: 16, paddingBottom: isMobile ? 100 : 32 }}  // ← absorb AppShell padding
  showsVerticalScrollIndicator={false}
/>
  );
}

function EmptyState({ onCreate }) {
  return (
    <View className="rounded-xl border border-dashed border-border bg-card/50 p-8 items-center text-center">
      <View className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Mic size={28} color="rgb(178, 92, 70)" />
      </View>
      <Text className="font-medium text-foreground">Your diary is empty</Text>
      <Text className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
        Press the record button to capture your thoughts, your day, or anything
        worth remembering. We'll transcribe it for you.
      </Text>
      <Button
        onPress={onCreate}
        className="mt-5 bg-primary"
      >
        <View className="flex-row items-center gap-2">
          <Plus size={16} color="rgb(250, 246, 238)" />
          <Text className="text-primary-foreground font-medium">Record your first entry</Text>
        </View>
      </Button>
    </View>
  );
}