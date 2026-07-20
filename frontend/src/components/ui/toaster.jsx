// VoiceDiary Toaster — React Native port of src/components/ui/toaster.tsx.
// Renders the active toasts from useToast at the top of the screen.

import * as React from "react";
import { View } from "react-native";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      <ToastViewport>
        <View className="flex flex-col gap-2">
          {toasts.map(function ({ id, title, description, action, variant, open, ...props }) {
            if (open === false) return null;
            return (
              <Toast key={id} variant={variant} {...props}>
                <View className="flex flex-col gap-1 flex-1">
                  {title ? <ToastTitle>{title}</ToastTitle> : null}
                  {description ? (
                    <ToastDescription>{description}</ToastDescription>
                  ) : null}
                </View>
                {action}
                <ToastClose onPress={() => dismiss(id)} />
              </Toast>
            );
          })}
        </View>
      </ToastViewport>
    </ToastProvider>
  );
}
