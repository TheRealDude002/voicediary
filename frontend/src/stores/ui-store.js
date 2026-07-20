// VoiceDiary UI store — mirrors src/stores/ui-store.ts.
// Holds the active view, selected entry id, mobile sidebar visibility,
// and the offline queue length.

import { create } from "zustand";

export const ViewId = {
  HOME: "home",
  RECORD: "record",
  CALENDAR: "calendar",
  SEARCH: "search",
};

export const useUIStore = create((set) => ({
  activeView: "home",
  selectedEntryId: null, // opens the Entry Detail dialog when set
  sidebarOpen: false, // mobile sidebar
  pendingSyncCount: 0, // offline-recorded entries pending upload

  setView: (view) => set({ activeView: view, sidebarOpen: false }),
  openEntry: (id) => set({ selectedEntryId: id }),
  closeEntry: () => set({ selectedEntryId: null }),
  toggleSidebar: (open) =>
    set((s) => ({ sidebarOpen: typeof open === "boolean" ? open : !s.sidebarOpen })),
  setPendingSyncCount: (n) => set({ pendingSyncCount: n }),
}));
