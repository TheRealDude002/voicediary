// VoiceDiary Alert — React Native port of src/components/ui/alert.tsx.

import * as React from "react";
import { Text, View } from "react-native";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm flex-row items-start gap-3",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        destructive:
          "text-destructive bg-card border-destructive/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({ className, variant, children, ...props }) {
  return (
    <View
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {children}
    </View>
  );
}

function AlertTitle({ className, children, ...props }) {
  return (
    <Text
      data-slot="alert-title"
      className={cn("font-medium tracking-tight text-foreground", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

function AlertDescription({ className, children, ...props }) {
  return (
    <Text
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground text-sm leading-relaxed flex-1",
        className
      )}
      {...props}
    >
      {children}
    </Text>
  );
}

export { Alert, AlertTitle, AlertDescription };
