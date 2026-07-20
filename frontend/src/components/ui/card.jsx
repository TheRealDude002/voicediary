// VoiceDiary Card — React Native port of src/components/ui/card.tsx.

import * as React from "react";
import { Text, View } from "react-native";

import { cn } from "@/lib/utils";

function Card({ className, ...props }) {
  return (
    <View
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <View
      data-slot="card-header"
      className={cn("grid items-start gap-1.5 px-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, children, ...props }) {
  return (
    <Text
      data-slot="card-title"
      className={cn("text-base leading-none font-semibold text-foreground", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

function CardDescription({ className, children, ...props }) {
  return (
    <Text
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

function CardAction({ className, ...props }) {
  return (
    <View
      data-slot="card-action"
      className={cn("self-start", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }) {
  return (
    <View
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }) {
  return (
    <View
      data-slot="card-footer"
      className={cn("flex items-center px-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
