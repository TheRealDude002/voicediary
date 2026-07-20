// VoiceDiary AppShell — React Native port of src/components/layout/AppShell.tsx.
// Header + nav (sidebar on desktop, bottom tabs on mobile) + content area.
// Mirrors apps/mobile/src/navigation/MainTabs.jsx.

import { useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Home, Mic, Calendar, Search, LogOut, NotebookPen, Sun, Moon } from "lucide-react-native";
import { useTheme } from "@/stores/theme-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useEntryStore } from "@/stores/entry-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { HomeView } from "@/components/home/HomeView";
import { RecordView } from "@/components/record/RecordView";
import { CalendarView } from "@/components/calendar/CalendarView";
import { SearchView } from "@/components/search/SearchView";
import { EntryDetailView } from "@/components/entry/EntryDetailView";

const NAV_ITEMS = [
  { id: "home", label: "Entries", icon: Home },
  { id: "record", label: "Record", icon: Mic },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "search", label: "Search", icon: Search },
];

export function AppShell() {
  const { user, logout } = useAuthStore();
  const { activeView, setView } = useUIStore();
  const fetchEntries = useEntryStore((s) => s.fetchEntries);
  const isMobile = useIsMobile();

  // Prime the entry store on first authenticated render
  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const initials = (user?.displayName ?? user?.email ?? "?")
    .split(/\s+/)
    .map((s) => s[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  const renderActiveView = () => {
    switch (activeView) {
      case "home":
        return <HomeView />;
      case "record":
        return <RecordView />;
      case "calendar":
        return <CalendarView />;
      case "search":
        return <SearchView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header — sticky */}
      <View className="border-b border-border bg-background/95">
        <View className="flex h-14 flex-row items-center justify-between px-4">
          <View className="flex flex-row items-center gap-2.5">
            <View className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <NotebookPen color="rgb(250, 246, 238)" size={16} />
            </View>
            <Text className="font-semibold tracking-tight text-foreground">
              VoiceDiary
            </Text>
          </View>

          <View className="flex flex-row items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Pressable className="flex flex-row items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {initials || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <Text
                    className="hidden sm:block text-sm font-medium text-foreground max-w-[140px]"
                    numberOfLines={1}
                  >
                    {user?.displayName ?? user?.email}
                  </Text>
                </Pressable>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <View className="flex flex-col">
                    <Text className="text-sm font-medium text-foreground">{user?.displayName}</Text>
                    <Text className="text-xs text-muted-foreground font-normal" numberOfLines={1}>
                      {user?.email}
                    </Text>
                  </View>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onPress={() => void logout()}
                  variant="destructive"
                >
                  <LogOut size={16} color="rgb(220, 80, 70)" />
                  <Text className="text-destructive text-sm">Sign out</Text>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </View>
        </View>
      </View>

      <View className="flex-1 flex flex-row">
        {/* Sidebar — desktop / tablet */}
        {!isMobile && (
          <View className="w-56 shrink-0 px-4 py-4">
            <View className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  active={activeView === item.id}
                  onClick={() => setView(item.id)}
                />
              ))}
            </View>
          </View>
        )}


{/* Main content */}
{activeView === "home" || activeView === undefined ? (
  // HomeView owns its own FlatList — render it flex-1, NOT inside a ScrollView
  <View className="flex-1">
    <HomeView />
  </View>
) : (
  <ScrollView
    className="flex-1"
    contentContainerStyle={{ padding: 16, paddingBottom: isMobile ? 100 : 32 }}
    keyboardShouldPersistTaps="handled"
  >
    <View className="vd-fade">{renderActiveView()}</View>
  </ScrollView>
)}
      </View>

      {/* Bottom nav — mobile only */}
      {isMobile && (
        <View
          className="border-t border-border bg-background/95"
          style={{ paddingBottom: 0 }}
        >
          <View className="flex flex-row h-16">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setView(item.id)}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-0.5",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon
                    size={20}
                    color={active ? "rgb(178, 92, 70)" : "rgb(130, 110, 90)"}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <Text
                    className={cn(
                      "text-xs font-medium",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Entry Detail — full-screen overlay (Dialog-driven) */}
      <EntryDetailView />
    </View>
  );
}

function NavButton({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <Pressable
      onPress={onClick}
      className={cn(
        "flex flex-row items-center gap-2.5 rounded-lg px-3 py-2",
        active
          ? "bg-primary"
          : "bg-transparent"
      )}
    >
      <Icon
        size={16}
        color={active ? "rgb(250, 246, 238)" : "rgb(130, 110, 90)"}
      />
      <Text
        className={cn(
          "text-sm font-medium",
          active ? "text-primary-foreground" : "text-muted-foreground"
        )}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onPress={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun size={16} color="rgb(60, 50, 40)" /> : <Moon size={16} color="rgb(60, 50, 40)" />}
    </Button>
  );
}