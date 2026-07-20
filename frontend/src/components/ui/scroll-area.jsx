// VoiceDiary ScrollArea — React Native port of src/components/ui/scroll-area.tsx.
// The original wrapped Radix ScrollArea; in RN we use ScrollView directly
// and preserve the same API so existing call sites continue to work.

import * as React from "react";
import { ScrollView, View } from "react-native";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef(function ScrollArea(
  { className, children, ...props },
  ref
) {
  return (
    <View
      ref={ref}
      data-slot="scroll-area"
      className={cn("relative", className)}
    >
      <ScrollView
        data-slot="scroll-area-viewport"
        className="w-full h-full"
        showsVerticalScrollIndicator
        {...props}
      >
        {children}
      </ScrollView>
    </View>
  );
});

function ScrollBar() {
  // RN ScrollView manages its own scrollbar — no separate primitive needed.
  return null;
}

export { ScrollArea, ScrollBar };
