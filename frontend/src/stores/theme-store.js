// VoiceDiary theme store — replaces next-themes.
// The original used next-themes (a React context provider with a "class"
// strategy that toggled a `dark` class on <html>). In React Native we
// persist the theme string in AsyncStorage and apply it through
// NativeWind's useColorScheme override (see App.jsx ThemeBridge).

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: "light", // user-selected theme (light | dark)
      isHydrated: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setHydrated: (v) => set({ isHydrated: v }),
    }),
    {
      name: "vd-theme",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.(true);
      },
    }
  )
);

// Drop-in replacement for next-themes' useTheme hook.
export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  return {
    theme,
    setTheme,
    resolvedTheme: theme,
    themes: ["light", "dark"],
  };
}
