// VoiceDiary entry store — mirrors src/stores/entry-store.ts.
// Holds the in-memory entry list + cursor pagination state, plus search
// results and active filters. Screens read/write through here instead of
// calling entryApi directly (so the list can be updated optimistically).

import { create } from "zustand";
import { entryApi } from "@/lib/api-client";

export const useEntryStore = create((set, get) => ({
  entries: [],
  nextCursor: null,
  isLoading: false,
  isLoadingMore: false,
  isCreating: false,
  error: null,

  searchQuery: "",
  searchResults: null, // null = no search performed
  isSearching: false,
  searchError: null,
  activeTagFilters: [],

  fetchEntries: async () => {
    set({ isLoading: true, error: null });
    try {
      const { entries, nextCursor } = await entryApi.list({ limit: 20 });
      set({ entries, nextCursor, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load entries",
      });
    }
  },

  loadMore: async () => {
    const { nextCursor, isLoadingMore, entries } = get();
    if (!nextCursor || isLoadingMore) return;
    set({ isLoadingMore: true });
    try {
      const res = await entryApi.list({ cursor: nextCursor, limit: 20 });
      set({
        entries: [...entries, ...res.entries],
        nextCursor: res.nextCursor,
        isLoadingMore: false,
      });
    } catch {
      set({ isLoadingMore: false });
    }
  },

  addEntry: (entry) => set((s) => ({ entries: [entry, ...s.entries] })),

  updateEntry: (id, patch) =>
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  removeEntry: (id) =>
    set((s) => ({
      entries: s.entries.filter((e) => e.id !== id),
      searchResults: s.searchResults
        ? s.searchResults.filter((e) => e.id !== id)
        : null,
    })),

  upsertEntry: (entry) =>
    set((s) => {
      const exists = s.entries.some((e) => e.id === entry.id);
      const list = exists
        ? s.entries.map((e) => (e.id === entry.id ? entry : e))
        : [entry, ...s.entries];
      const search = s.searchResults
        ? (() => {
            const sExists = s.searchResults.some((e) => e.id === entry.id);
            return sExists
              ? s.searchResults.map((e) => (e.id === entry.id ? entry : e))
              : s.searchResults;
          })()
        : null;
      return { entries: list, searchResults: search };
    }),

  search: async (query) => {
    const q = query.trim();
    if (!q) {
      set({ searchResults: null, searchQuery: "", isSearching: false });
      return;
    }
    set({ isSearching: true, searchQuery: q, searchError: null });
    try {
      const results = await entryApi.search(q, get().activeTagFilters);
      set({ searchResults: results, isSearching: false });
    } catch (err) {
      set({
        isSearching: false,
        searchError: err instanceof Error ? err.message : "Search failed",
      });
    }
  },

  clearSearch: () =>
    set({ searchResults: null, searchQuery: "", searchError: null }),

  toggleTagFilter: (tagId) =>
    set((s) => {
      const has = s.activeTagFilters.includes(tagId);
      const next = has
        ? s.activeTagFilters.filter((t) => t !== tagId)
        : [...s.activeTagFilters, tagId];
      return { activeTagFilters: next };
    }),

  clearTagFilters: () => set({ activeTagFilters: [] }),

  reset: () =>
    set({
      entries: [],
      nextCursor: null,
      isLoading: false,
      isLoadingMore: false,
      isCreating: false,
      error: null,
      searchQuery: "",
      searchResults: null,
      isSearching: false,
      searchError: null,
      activeTagFilters: [],
    }),
}));

// expose isCreating for the record view
export const setCreating = (creating) =>
  useEntryStore.setState({ isCreating: creating });
