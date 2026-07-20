// VoiceDiary Sheet — React Native port of src/components/ui/sheet.tsx.
// The original used Radix Dialog. We use react-native-modal with a
// slide-in-from-right animation. Kept for API parity with the original
// (the app imports it but does not currently render it).

import * as React from "react";
import { Pressable, Text, View } from "react-native";
import Modal from "react-native-modal";

import { cn } from "@/lib/utils";
import { X } from "lucide-react-native";

function Sheet({ open, onOpenChange, children }) {
  return (
    <Modal
      isVisible={!!open}
      onBackdropPress={() => onOpenChange?.(false)}
      onBackButtonPress={() => onOpenChange?.(false)}
      animationIn="slideInRight"
      animationOut="slideOutRight"
      animationInTiming={300}
      animationOutTiming={250}
      backdropOpacity={0.5}
      style={{ margin: 0 }}
      useNativeDriver
    >
      {children}
    </Modal>
  );
}

function SheetTrigger({ children }) {
  return children;
}

function SheetContent({ className, children, side = "right", ...props }) {
  return (
    <View
      data-slot="sheet-content"
      className={cn(
        "bg-background border-l border-border flex-1 h-full pr-4 pl-4 pt-12",
        side === "right" && "self-end",
        className
      )}
      {...props}
    >
      {children}
      <Pressable
        className="absolute top-4 right-4"
        accessibilityLabel="Close"
      >
        <X size={16} color="rgb(60, 50, 40)" />
      </Pressable>
    </View>
  );
}

function SheetHeader({ className, ...props }) {
  return (
    <View
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }) {
  return (
    <View
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, children, ...props }) {
  return (
    <Text
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

function SheetDescription({ className, children, ...props }) {
  return (
    <Text
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

function SheetClose() {
  return null;
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
