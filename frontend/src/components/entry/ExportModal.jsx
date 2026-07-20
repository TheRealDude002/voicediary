// VoiceDiary ExportModal — React Native port of src/components/entry/ExportModal.tsx.
// Modal with three export format buttons (PDF, TXT, MD).
// Calls exportEntry, which writes a file via expo-file-system and presents
// a native share sheet via expo-sharing (replacing the original browser
// download anchor).
// Mirrors apps/mobile/src/components/ExportModal.jsx.

import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Download, FileText, FileType, Loader2 } from "lucide-react-native";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { exportEntry } from "@/lib/api-client";

const FORMAT_INFO = {
  pdf: { label: "PDF", desc: "Printable formatted document", icon: FileType },
  txt: { label: "Plain Text", desc: "Universal plain text file", icon: FileText },
  md: { label: "Markdown", desc: "With YAML metadata frontmatter", icon: FileText },
};

export function ExportModal({ entryId, open, onOpenChange }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const handleExport = async (format) => {
    if (!entryId) return;
    setBusy(format);
    setError(null);
    try {
      await exportEntry(entryId, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setError(null);
          setBusy(null);
        }
        onOpenChange?.(o);
      }}
    >
      <DialogContent className="max-w-md" onOpenChange={onOpenChange}>
        <DialogHeader>
          <DialogTitle>Export entry</DialogTitle>
          <DialogDescription>
            Choose a format. The file will be saved to your device.
          </DialogDescription>
        </DialogHeader>

        <View className="flex flex-col gap-2 py-2">
          {Object.keys(FORMAT_INFO).map((fmt) => {
            const info = FORMAT_INFO[fmt];
            const Icon = info.icon;
            const isBusy = busy === fmt;
            return (
              <Pressable
                key={fmt}
                disabled={busy !== null}
                onPress={() => handleExport(fmt)}
                className={cn(
                  "flex flex-row items-center gap-3 rounded-lg border border-border bg-card p-3",
                  "disabled:opacity-60"
                )}
              >
                <View className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                  {isBusy ? (
                    <Loader2 size={16} color="rgb(178, 92, 70)" className="animate-spin" />
                  ) : (
                    <Icon size={16} color="rgb(178, 92, 70)" />
                  )}
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-medium text-foreground">
                    {info.label}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {info.desc}
                  </Text>
                </View>
                <Download size={16} color="rgb(130, 110, 90)" />
              </Pressable>
            );
          })}
        </View>

        {error && (
          <Text className="text-sm text-destructive px-1">{error}</Text>
        )}

        <DialogFooter>
          <Button variant="ghost" onPress={() => onOpenChange?.(false)}>
            <Text className="text-foreground font-medium">Close</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
