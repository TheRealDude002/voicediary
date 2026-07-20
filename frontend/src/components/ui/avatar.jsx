// VoiceDiary Avatar — React Native port of src/components/ui/avatar.tsx.

import * as React from "react";
import { Image, Text, View } from "react-native";

import { cn } from "@/lib/utils";

const Avatar = React.forwardRef(function Avatar({ className, ...props }, ref) {
  return (
    <View
      ref={ref}
      data-slot="avatar"
      className={cn(
        "relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    />
  );
});

const AvatarImage = React.forwardRef(function AvatarImage(
  { className, source, ...props },
  ref
) {
  return (
    <Image
      ref={ref}
      data-slot="avatar-image"
      source={source}
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
});

const AvatarFallback = React.forwardRef(function AvatarFallback(
  { className, children, ...props },
  ref
) {
  return (
    <View
      ref={ref}
      data-slot="avatar-fallback"
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <Text className="text-current text-xs font-medium">{children}</Text>
    </View>
  );
});

export { Avatar, AvatarImage, AvatarFallback };
