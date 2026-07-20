// VoiceDiary Badge — React Native port of src/components/ui/badge.tsx.

import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit shrink-0 gap-1 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-white",
        outline:
          "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  children,
  onClick,
  ...props
}) {
  const Comp = onClick ? Pressable : View;
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      onPress={onClick}
      {...props}
    >
      {typeof children === "string" ? (
        <Text className="text-current text-xs font-medium">{children}</Text>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Badge, badgeVariants };
