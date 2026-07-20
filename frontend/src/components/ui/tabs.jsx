// VoiceDiary Tabs — React Native port of src/components/ui/tabs.tsx.
// The original used Radix Tabs primitives. We re-implement the same
// controlled API (value, onValueChange, TabsList/TabsTrigger/TabsContent)
// with plain React.

import * as React from "react";
import { Pressable, Text, View } from "react-native";

import { cn } from "@/lib/utils";

const TabsContext = React.createContext({
  value: undefined,
  onValueChange: () => {},
});

function Tabs({ value, defaultValue, onValueChange, className, children, ...props }) {
  const [internal, setInternal] = React.useState(defaultValue);
  const current = value ?? internal;
  const handleChange = React.useCallback(
    (v) => {
      if (onValueChange) onValueChange(v);
      else setInternal(v);
    },
    [onValueChange]
  );
  return (
    <TabsContext.Provider value={{ value: current, onValueChange: handleChange }}>
      <View data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props}>
        {children}
      </View>
    </TabsContext.Provider>
  );
}

function TabsList({ className, children, ...props }) {
  return (
    <View
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-full items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

function TabsTrigger({ value, className, children, ...props }) {
  const ctx = React.useContext(TabsContext);
  const isActive = ctx.value === value;
  return (
    <Pressable
      data-slot="tabs-trigger"
      onPress={() => ctx.onValueChange?.(value)}
      className={cn(
        "flex-1 items-center justify-center rounded-md px-2 py-1 h-[calc(100%-1px)]",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground",
        className
      )}
      {...props}
    >
      {typeof children === "string" ? (
        <Text className={cn("text-sm font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

function TabsContent({ value, className, children, ...props }) {
  const ctx = React.useContext(TabsContext);
  if (ctx.value !== value) return null;
  return (
    <View data-slot="tabs-content" className={cn("flex-1", className)} {...props}>
      {children}
    </View>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
