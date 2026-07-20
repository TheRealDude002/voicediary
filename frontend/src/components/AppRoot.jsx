// VoiceDiary AppRoot — React Native port of src/components/AppRoot.tsx.
// Decides between splash / auth screen / app shell.
// Rehydrates the persisted auth store on mount.

import { useEffect } from "react";
import { View, Text } from "react-native";
import { Loader2, NotebookPen } from "lucide-react-native";
import { useAuthStore } from "@/stores/auth-store";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AppShell } from "@/components/layout/AppShell";

export function AppRoot() {
  const { isLoading, isAuthenticated, bootstrap } = useAuthStore();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (isLoading) {
    return (
      <View className="flex-1 flex-col items-center justify-center gap-4 bg-background">
        <View className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <NotebookPen color="rgb(250, 246, 238)" size={28} />
        </View>
        <View className="flex flex-row items-center gap-2">
          <Loader2 size={16} color="rgb(130, 110, 90)" className="animate-spin" />
          <Text className="text-sm text-muted-foreground">Loading your diary…</Text>
        </View>
      </View>
    );
  }

  if (!isAuthenticated) return <AuthScreen />;
  return <AppShell />;
}
