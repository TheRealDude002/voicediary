// VoiceDiary App entry point — React Native / Expo port of
// src/app/page.tsx + src/app/layout.tsx.
//
// The original Next.js layout wrapped every page in <AppProviders> and
// rendered <AppRoot> on the home page. The layout also pulled in Geist
// fonts via next/font/google and applied body background/foreground
// classes. In Expo we apply the same classes to the root <View> and
// subscribe to the persisted theme so dark mode toggles work.

import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { View } from "react-native";
import { useColorScheme } from "nativewind";

import "./global.css";
import "@/lib/nativewind-flatlist-fix"; // Must run after global.css (NativeWind init) and before any FlatList renders
import "@/lib/offline-queue"; // Side-effect: starts the background upload poller
import { AppProviders } from "@/components/providers/AppProviders";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { startPoller as startOfflinePoller } from "@/lib/offline-queue";
import { AppRoot } from "@/components/AppRoot";
import { Toaster } from "@/components/ui/toaster";
import { useThemeStore } from "@/stores/theme-store";
import { Platform } from "react-native"
function ThemeBridge({ children }) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();
  const { colorScheme, setColorScheme } = useColorScheme();

  // Sync the user-selected theme into NativeWind's color scheme so all
  // `dark:` Tailwind variants respond to the persisted preference.
  useEffect(() => {
    if (colorScheme !== theme) {
      if (Platform.OS !== "web") {
        setColorScheme(theme);
      }
    }
  }, [theme, colorScheme, setColorScheme]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "rgb(46, 40, 35)" : "rgb(250, 246, 238)",
        paddingTop: insets.top,
      }}
      className={isDark ? "dark" : ""}
    >
      {children}
    </View>
  );
}

export default function App() {
  // Kick off the offline upload poller on mount
  useEffect(() => {
    startOfflinePoller();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeBridge>
        <StatusBar style="auto" />
        <OfflineBanner />
        <AppProviders>
          <AppRoot />
          <Toaster />
        </AppProviders>
      </ThemeBridge>
    </SafeAreaProvider>
  );
}
