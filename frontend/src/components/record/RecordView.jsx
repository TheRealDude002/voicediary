// VoiceDiary RecordView — React Native port of src/components/record/RecordView.tsx.
// Full-screen recorder. Uses useRecorder hook. Shows recording duration,
// waveform animation. TagPicker and mood selector shown after recording stops.
// Submit uploads entry via entryApi.createEntry.
// Mirrors apps/mobile/src/screens/record/RecordScreen.jsx.

import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { View, Text, ScrollView } from "react-native";
import { Loader2, Send, Trash2, AlertCircle } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RecordButton } from "@/components/record/RecordButton";
import { WaveformViz } from "@/components/record/WaveformViz";
import { TagPicker } from "@/components/record/TagPicker";
import { MoodSelector } from "@/components/record/MoodSelector";
import { useRecorder } from "@/hooks/use-recorder";
import { useEntryStore } from "@/stores/entry-store";
import { useUIStore } from "@/stores/ui-store";
import { useToast } from "@/hooks/use-toast";
import { entryApi } from "@/lib/api-client";
import { enqueue as enqueueOffline, onUploadComplete } from "@/lib/offline-queue";
import { isOnline } from "@/lib/network";
import { formatDuration } from "@/lib/format-date";

export function RecordView() {
  const recorder = useRecorder();
  const [tags, setTags] = useState([]);
  const [mood, setMood] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addEntry = useEntryStore((s) => s.addEntry);
  const setView = useUIStore((s) => s.setView);
  const { toast } = useToast();
  const qc = useQueryClient();

  // Reset recorder when component unmounts (e.g. user navigates away)
  useEffect(() => {
    return () => {
      // Note: we intentionally do NOT reset the recorder here if a recording
      // is in progress — that's handled by the explicit Cancel button.
    };
  }, []);

  const { status, durationSec, audioBlob, mimeType, error, analyser } = recorder;
  const isRecording = status === "recording" || status === "paused";
  const hasRecording = !!audioBlob;

  const handleStart = useCallback(async () => {
    setTags([]);
    setMood(null);
    await recorder.start();
  }, [recorder]);

  const handleStop = useCallback(async () => {
    await recorder.stop();
  }, [recorder]);

  const handleCancel = useCallback(() => {
    recorder.reset();
    setTags([]);
    setMood(null);
  }, [recorder]);

  // Subscribe to "offline upload completed" events so when the background
  // poller successfully uploads a queued entry, it appears in the list.
  useEffect(() => {
    const unsub = onUploadComplete(({ entry }) => {
      addEntry(entry);
      void qc.invalidateQueries({ queryKey: ["entries"] });
      toast({
        title: "Entry uploaded",
        description: "Your offline recording is now being transcribed.",
      });
    });
    return unsub;
  }, [addEntry, qc, toast]);

  const handleSubmit = useCallback(async () => {
    if (!audioBlob || !durationSec) return;

    setIsSubmitting(true);
    try {
      // If we're offline, queue the upload instead of failing.
      // The audio file URI is preserved in the queue and retried
      // automatically when the network returns.
      if (!isOnline()) {
        await enqueueOffline({
          fileUri: audioBlob.uri,
          mimeType: mimeType || "audio/m4a",
          duration: durationSec,
          mood,
          tags,
        });
        toast({
          title: "Saved offline",
          description:
            "You're offline — your entry will upload automatically when you reconnect.",
        });
        recorder.reset();
        setTags([]);
        setMood(null);
        setView("home");
        return;
      }

      const entry = await entryApi.create({
        fileUri: audioBlob.uri,
        mimeType: mimeType || "audio/m4a",
        duration: durationSec,
        mood,
        tags,
      });
      addEntry(entry);
      void qc.invalidateQueries({ queryKey: ["entries"] });
      toast({
        title: "Entry saved",
        description: "Transcribing now — check back in a moment.",
      });

      // Clean up local recording state
      recorder.reset();
      setTags([]);
      setMood(null);
      setView("home");
    } catch (err) {
      // If the error is a network error, queue for retry instead of failing
      const isNetworkErr =
        err?.code === "network_error" || err?.status === 0;
      if (isNetworkErr) {
        try {
          await enqueueOffline({
            fileUri: audioBlob.uri,
            mimeType: mimeType || "audio/m4a",
            duration: durationSec,
            mood,
            tags,
          });
          toast({
            title: "Saved offline",
            description:
              "Network error — your entry will upload automatically when you reconnect.",
          });
          recorder.reset();
          setTags([]);
          setMood(null);
          setView("home");
          return;
        } catch (queueErr) {
          // Fall through to the error toast below
        }
      }

      toast({
        title: "Upload failed",
        description:
          err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [recorder, audioBlob, durationSec, mimeType, mood, tags, addEntry, qc, toast, setView]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, gap: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text className="text-xl font-semibold tracking-tight text-foreground">
          Record
        </Text>
        <Text className="text-sm text-muted-foreground mt-0.5">
          Speak freely. You can add tags and mood afterwards.
        </Text>
      </View>

      {error && (
        <Alert variant="destructive">
          <AlertCircle size={16} color="rgb(220, 80, 70)" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Recorder card */}
      <View className="rounded-xl border border-border bg-card p-6 flex flex-col items-center gap-5">
        <WaveformViz
          analyser={analyser}
          active={status === "recording"}
          bars={32}
        />

        <View className="flex items-center gap-2">
          <Text className="font-mono text-3xl text-foreground tabular-nums">
            {formatDuration(durationSec)}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {status === "idle" && !hasRecording && "Tap the mic to start"}
            {status === "recording" && "Recording…"}
            {status === "paused" && "Paused — resume or stop"}
            {status === "idle" && hasRecording && "Recording ready"}
          </Text>
        </View>

        <View className="flex flex-row items-center gap-4 py-2">
          <RecordButton
            status={status}
            onRecord={handleStart}
            onPause={recorder.pause}
            onResume={recorder.resume}
            onStop={handleStop}
            disabled={isSubmitting}
          />
        </View>
      </View>

      {/* Post-recording: tags + mood + actions */}
      {hasRecording && (
        <View className="rounded-xl border border-border bg-card p-5 flex flex-col gap-5 vd-fade">
          <View>
            <Label className="text-xs font-medium text-foreground mb-2">
              Mood
            </Label>
            <MoodSelector value={mood} onChange={setMood} />
          </View>
          <View>
            <Label className="text-xs font-medium text-foreground mb-2">
              Tags
            </Label>
            <TagPicker selected={tags} onChange={setTags} />
          </View>

          <View className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              onPress={handleCancel}
              disabled={isSubmitting}
            >
              <View className="flex-row items-center gap-2">
                <Trash2 size={16} color="rgb(60, 50, 40)" />
                <Text className="text-foreground font-medium">Discard</Text>
              </View>
            </Button>
            <Button
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="bg-primary"
            >
              {isSubmitting ? (
                <View className="flex-row items-center gap-2">
                  <Loader2 size={16} color="rgb(250, 246, 238)" className="animate-spin" />
                  <Text className="text-primary-foreground font-medium">Saving…</Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-2">
                  <Send size={16} color="rgb(250, 246, 238)" />
                  <Text className="text-primary-foreground font-medium">Save entry</Text>
                </View>
              )}
            </Button>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
