// VoiceDiary Dialog — React Native port of src/components/ui/dialog.tsx.
// The original used Radix Dialog primitives. We re-implement the same
// controlled API (open, onOpenChange, DialogContent, DialogHeader, etc.)
// using react-native-modal.

import * as React from "react";
import { Pressable, Text, View } from "react-native";
import Modal from "react-native-modal";

import { cn } from "@/lib/utils";
import { X } from "lucide-react-native";

function Dialog({ open, onOpenChange, children }) {
  return (
    <Modal
      isVisible={!!open}
      onBackdropPress={() => onOpenChange?.(false)}
      onBackButtonPress={() => onOpenChange?.(false)}
      animationIn="fade"
      animationOut="fadeOut"
      animationInTiming={200}
      animationOutTiming={150}
      backdropOpacity={0.5}
      style={{ margin: 0, alignItems: "center", justifyContent: "center" }}
      useNativeDriver
      hideModalContentWhileAnimating
    >
      {children}
    </Modal>
  );
}

function DialogTrigger({ children, asChild, ...props }) {
  // In RN we don't have a slot primitive; children with onPress handle this.
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
  // No-op in this port — close handling is wired through onOpenChange.
  return null;
}

function DialogPortal({ children }) {
  return children;
}

function DialogOverlay() {
  return null; // Modal handles overlay internally
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
