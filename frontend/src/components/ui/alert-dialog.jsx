// VoiceDiary AlertDialog — React Native port of src/components/ui/alert-dialog.tsx.
// Same controlled API as the original (open, onOpenChange, AlertDialogContent,
// AlertDialogHeader, AlertDialogFooter, etc.) implemented with react-native-modal.

import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { Modal, Pressable, Text, View } from "react-native"

import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

function AlertDialog({ open, onOpenChange, children }) {
  return (
    <Modal
      visible={!!open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange?.(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          alignItems: "center",
          justifyContent: "center",
        }}
        onStartShouldSetResponder={() => {
          onOpenChange?.(false);
          return false;
        }}
      >
        {children}
      </View>
    </Modal>
  );
}

function AlertDialogContent({ className, children, ...props }) {
  return (
    <View
      data-slot="alert-dialog-content"
      className={cn(
        "bg-background border border-border rounded-lg p-6 shadow-lg w-full max-w-[calc(100%-2rem)]",
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

function AlertDialogHeader({ className, ...props }) {
  return (
    <View
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }) {
  return (
    <View
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col gap-2 mt-4 items-end", className)}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, children, ...props }) {
  return (
    <Text
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

function AlertDialogDescription({ className, children, ...props }) {
  return (
    <Text
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

function AlertDialogAction({ className, children, onPress, ...props }) {
  return (
    <Pressable
      data-slot="alert-dialog-action"
      onPress={onPress}
      className={cn(buttonVariants({ variant: "default" }), className)}
      {...props}
    >
      {typeof children === "string" ? (
        <Text className="text-primary-foreground text-sm font-medium">{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

function AlertDialogCancel({ className, children, onPress, ...props }) {
  return (
    <Pressable
      data-slot="alert-dialog-cancel"
      onPress={onPress}
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    >
      {typeof children === "string" ? (
        <Text className="text-foreground text-sm font-medium">{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
