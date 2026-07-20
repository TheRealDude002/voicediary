// VoiceDiary Toast primitives — React Native port of src/components/ui/toast.tsx.
// The original used Radix Toast. We re-implement the same surface
// (ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription,
// ToastClose, ToastAction) with plain React Native Views.

import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { X } from "lucide-react-native";

const ToastProvider = ({ children }) => children;

const ToastViewport = ({ className, ...props }) => {
  return (
    <View
      className={cn(
        "absolute top-0 left-0 right-0 z-[100] p-4",
        className
      )}
      pointerEvents="box-none"
      {...props}
    />
  );
};

const toastVariants = cva(
  "rounded-md border p-4 pr-6 shadow-lg flex-row items-start justify-between gap-2",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef(function Toast(
  { className, variant, children, ...props },
  ref
) {
  return (
    <View
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {children}
    </View>
  );
});

const ToastAction = React.forwardRef(function ToastAction(
  { className, children, ...props },
  ref
) {
  return (
    <Pressable
      ref={ref}
      className={cn(
        "h-8 px-3 rounded-md border border-border items-center justify-center",
        className
      )}
      {...props}
    >
      {typeof children === "string" ? (
        <Text className="text-sm font-medium text-foreground">{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
});

const ToastClose = React.forwardRef(function ToastClose(
  { className, ...props },
  ref
) {
  return (
    <Pressable
      ref={ref}
      className={cn("absolute top-1 right-1 p-1", className)}
      {...props}
    >
      <X size={14} color="rgb(60, 50, 40)" />
    </Pressable>
  );
});

const ToastTitle = React.forwardRef(function ToastTitle(
  { className, children, ...props },
  ref
) {
  return (
    <Text
      ref={ref}
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    >
      {children}
    </Text>
  );
});

const ToastDescription = React.forwardRef(function ToastDescription(
  { className, children, ...props },
  ref
) {
  return (
    <Text
      ref={ref}
      className={cn("text-sm opacity-90 text-foreground", className)}
      {...props}
    >
      {children}
    </Text>
  );
});

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastAction,
  ToastClose,
  ToastTitle,
  ToastDescription,
};
