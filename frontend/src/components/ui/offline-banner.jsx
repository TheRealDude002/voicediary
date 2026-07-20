// src/components/ui/offline-banner.jsx
//
// Small banner that appears at the top of the app when the device is
// offline. Also shows the count of entries queued for upload, if any.

import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { CloudOff, CloudUpload } from "lucide-react-native";
import { useOnline } from "@/lib/network";
import { getPendingCount, subscribe as subscribeToQueue } from "@/lib/offline-queue";

export function OfflineBanner() {
  const online = useOnline();
  const [pending, setPending] = useState(getPendingCount());

  useEffect(() => {
    const unsub = subscribeToQueue((q) => setPending(q.length));
    return unsub;
  }, []);

  // Don't render anything when online and no pending uploads
  if (online && pending === 0) return null;

  let message;
  let Icon;
  let bg;
  let fg;
  if (!online) {
    Icon = CloudOff;
    bg = "bg-amber-500/10";
    fg = "text-amber-900";
    message =
      pending > 0
        ? `Offline — ${pending} ${pending === 1 ? "entry" : "entries"} queued for upload`
        : "Offline — changes will sync when you reconnect";
  } else {
    // Online but have pending uploads (shouldn't normally happen — the poller
    // processes them within 30s — but visible here for transparency)
    Icon = CloudUpload;
    bg = "bg-blue-500/10";
    fg = "text-blue-900";
    message = `Uploading ${pending} ${pending === 1 ? "entry" : "entries"}…`;
  }

  const Icon2 = Icon;
  return (
    <View className={`${bg} border-b border-amber-500/20 px-4 py-2`}>
      <View className="flex flex-row items-center justify-center gap-2">
        <Icon2 size={14} color="rgb(120, 53, 15)" />
        <Text className={`${fg} text-xs font-medium`}>{message}</Text>
      </View>
    </View>
  );
}
