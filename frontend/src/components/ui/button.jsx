// VoiceDiary Button — React Native port of src/components/ui/button.tsx.
// Uses Pressable instead of <button>, StyleSheet-style class names via
// NativeWind. The cva variant system is preserved.

import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:opacity-50 shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs",
        destructive:
          "bg-destructive text-white shadow-xs",
        outline:
          "border border-border bg-background shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs",
        ghost:
          "bg-transparent text-foreground",
        link: "text-primary underline-offset-4",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}) {
  const Comp = asChild ? View : Pressable;
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {typeof children === "string" ? (
        <Text className="text-current text-sm font-medium">{children}</Text>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
