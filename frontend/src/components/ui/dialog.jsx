// VoiceDiary Dialog — React Native port of src/components/ui/dialog.tsx.
//
// Controlled API: { open, onOpenChange, DialogContent, DialogHeader, ... }.
//
// Implementation note: the previous version used `react-native-modal`,
// which is a native-only animation library that does NOT render on web.
// On web the Modal would mount but never paint, so dialogs (entry detail,
// alert confirmations, export modal) silently failed to appear.
//
// This version uses React Native's built-in `Modal` from "react-native",
// which react-native-web polyfills correctly. We add the backdrop,
// fade-in animation, and centering manually so the visual result is
// equivalent to what react-native-modal gave us on native.

import * as React from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { cn } from "@/lib/utils";
import { X } from "lucide-react-native";

function Dialog({ open, onOpenChange, children }) {
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

function DialogTrigger({ children, asChild, ...props }) {
  return children;
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onOpenChange,
  ...props
}) {
  return (
    <View
      data-slot="dialog-content"
      className={cn(
        "bg-background border border-border rounded-lg p-6 shadow-lg w-full max-w-[calc(100%-2rem)]",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <Pressable
          onPress={() => onOpenChange?.(false)}
          className="absolute top-4 right-4 rounded-xs opacity-70"
          accessibilityLabel="Close"
        >
          <X size={16} color="rgb(60, 50, 40)" />
        </Pressable>
      )}
    </View>
  );
}

function DialogHeader({ className, ...props }) {
  return (
    <View
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }) {
  return (
    <View
      data-slot="dialog-footer"
      className={cn("flex flex-col gap-2 mt-4", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, children, ...props }) {
  return (
    <Text
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold text-foreground", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

function DialogDescription({ className, children, ...props }) {
  return (
    <Text
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

function DialogClose() {
  return null;
}

function DialogPortal({ children }) {
  return children;
}

function DialogOverlay() {
  return null;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
