// VoiceDiary Skeleton — React Native port of src/components/ui/skeleton.tsx.

import * as React from "react";
import { View } from "react-native";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <View
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
