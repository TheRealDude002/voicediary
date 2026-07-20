// VoiceDiary EntryDetailView — React Native port of src/components/entry/EntryDetailView.tsx.
// Full-screen overlay dialog. Shows entry metadata, AudioPlayer, TranscriptView in sync.
// Edit tags/mood inline. Export button opens ExportModal.
// Delete with confirmation.
// Mirrors apps/mobile/src/screens/entry/EntryDetailScreen.jsx.

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { View, Text, ScrollView, Pressable } from "react-native";
import {
  CalendarDays,
  Clock,
  Download,
  Edit3,
  Loader2,
  RefreshCw,
  Trash2,
  X,
  Save,
  AlertCircle,
} from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AudioPlayer } from "@/components/entry/AudioPlayer";
import { TranscriptView } from "@/components/entry/TranscriptView";
import { ExportModal } from "@/components/entry/ExportModal";
import { TagPicker } from "@/components/record/TagPicker";
import { MoodSelector } from "@/components/record/MoodSelector";
import { useUIStore } from "@/stores/ui-store";
import { useEntryStore } from "@/stores/entry-store";
import { useToast } from "@/hooks/use-toast";
import { entryApi } from "@/lib/api-client";
import { moodById, tagById } from "@/lib/constants";
import {
  formatFull,
  formatDurationWords,
} from "@/lib/format-date";

export function EntryDetailView() {
  const { selectedEntryId, closeEntry } = useUIStore();
  const { updateEntry, removeEntry, upsertEntry } = useEntryStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Fetch the entry by id (and refresh every 3s if transcription is pending)
  const { data: entry, isLoading } = useQuery({
    queryKey: ["entry", selectedEntryId],
    queryFn: () => entryApi.get(selectedEntryId),
    enabled: !!selectedEntryId,
    refetchInterval: (query) => {
      const e = query.state.data;
      return e && (e.transcriptionStatus === "pending" || e.transcriptionStatus === "processing")
        ? 3000
        : false;
    },
  });

  // Reflect fetched updates back into the store so the list view stays fresh
  useEffect(() => {
    if (entry) {
      upsertEntry(entry);
    }
  }, [entry, upsertEntry]);

  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTags, setDraftTags] = useState([]);
  const [draftMood, setDraftMood] = useState(null);
  const [draftTranscript, setDraftTranscript] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetranscribing, setIsRetranscribing] = useState(false);
  const prevStatusRef = useRef(undefined);

  // Reset edit state when opening a different entry
  useEffect(() => {
    if (selectedEntryId) {
      setIsEditing(false);
      setShowExport(false);
      setShowDelete(false);
      setActiveWordIdx(-1);
      prevStatusRef.current = undefined;
    }
  }, [selectedEntryId]);

  // Sync draft state when entering edit mode
  useEffect(() => {
    if (isEditing && entry) {
      setDraftTags(entry.tags ?? []);
      setDraftMood(entry.mood);
      setDraftTranscript(entry.transcript ?? "");
    }
  }, [isEditing, entry]);

  // Notify when transcription completes
  useEffect(() => {
    if (!entry) return;
    const prev = prevStatusRef.current;
    if (prev && prev !== "done" && entry.transcriptionStatus === "done") {
      toast({
        title: "Transcription ready",
        description: "Your entry is now searchable.",
      });
    }
    prevStatusRef.current = entry.transcriptionStatus;
  }, [entry, toast]);

  const handleSave = useCallback(async () => {
    if (!entry) return;
    setIsSaving(true);
    try {
      const updated = await entryApi.update(entry.id, {
        tags: draftTags,
        mood: draftMood,
        // We don't patch transcript text from this UI for simplicity —
        // transcript edits would normally happen via a dedicated editor.
      });
      updateEntry(entry.id, updated);
      // Update the TanStack Query cache so the detail view re-renders
      // immediately with the new tags/mood (without waiting for a refetch).
      qc.setQueryData(["entry", entry.id], updated);
      setIsEditing(false);
      toast({ title: "Entry updated" });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [entry, draftTags, draftMood, updateEntry, qc, toast]);

  const handleDelete = useCallback(async () => {
    if (!entry) return;
    try {
      await entryApi.delete(entry.id);
      removeEntry(entry.id);
      toast({ title: "Entry deleted" });
      closeEntry();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }, [entry, removeEntry, closeEntry, toast]);

  const handleRetranscribe = useCallback(async () => {
    if (!entry) return;
    setIsRetranscribing(true);
    try {
      const updated = await entryApi.retranscribe(entry.id);
      upsertEntry(updated);
      toast({
        title: "Transcription complete",
        description: "Your entry is now searchable.",
      });
    } catch (err) {
      toast({
        title: "Transcription failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsRetranscribing(false);
    }
  }, [entry, upsertEntry, toast]);

  if (!selectedEntryId) return null;

  return (
    <>
      <Dialog
        open={!!selectedEntryId}
        onOpenChange={(o) => {
          if (!o) closeEntry();
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[92vh] flex flex-col gap-0 p-0"
          showCloseButton={false}
          onOpenChange={(o) => { if (!o) closeEntry(); }}
        >
          {/* Header bar */}
          <View className="flex flex-row items-center justify-between gap-2 px-5 py-3 border-b border-border bg-card">
            <View className="flex flex-row items-center gap-2 min-w-0 flex-1">
              <CalendarDays size={16} color="rgb(130, 110, 90)" />
              <Text className="text-xs text-muted-foreground flex-1" numberOfLines={1}>
                {entry ? formatFull(entry.createdAt) : "Loading…"}
              </Text>
            </View>
            <View className="flex flex-row items-center gap-1">
              {entry && !isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onPress={() => setShowExport(true)}
                >
                  <View className="flex-row items-center gap-1">
                    <Download size={16} color="rgb(60, 50, 40)" />
                    <Text className="text-foreground text-sm">Export</Text>
                  </View>
                </Button>
              )}
              {entry && !isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onPress={() => setIsEditing(true)}
                >
                  <View className="flex-row items-center gap-1">
                    <Edit3 size={16} color="rgb(60, 50, 40)" />
                    <Text className="text-foreground text-sm">Edit</Text>
                  </View>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onPress={closeEntry}
              >
                <X size={16} color="rgb(60, 50, 40)" />
              </Button>
            </View>
          </View>

          {/* Body */}
          <View className="overflow-hidden">
            {isLoading || !entry ? (
              <View className="px-5 py-4 flex flex-col gap-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-64 w-full" />
              </View>
            ) : (
              <ScrollView
                className="vd-scroll"
                style={{ maxHeight: 480 }}
                contentContainerStyle={{ padding: 20, gap: 16 }}
                showsVerticalScrollIndicator
              >
                <View className="flex flex-col gap-4">
                  {/* Meta */}
                  <View className="flex flex-row flex-wrap items-center gap-3">
                    <View className="flex flex-row items-center gap-1.5">
                      <Clock size={14} color="rgb(130, 110, 90)" />
                      <Text className="text-sm text-muted-foreground">
                        {formatDurationWords(entry.duration)}
                      </Text>
                    </View>
                    {entry.mood && (() => {
                      const m = moodById(entry.mood);
                      const MoodIcon = m?.icon;
                      if (!m) return null;
                      return (
                        <View className="flex flex-row items-center gap-1.5">
                          {MoodIcon && <MoodIcon size={14} color="rgb(130, 110, 90)" />}
                          <Text className="text-sm text-muted-foreground">
                            {m.label}
                          </Text>
                        </View>
                      );
                    })()}
                    {entry.tags?.length > 0 && (
                      <View className="flex flex-row flex-wrap gap-1.5">
                        {entry.tags.map((t) => {
                          const tag = tagById(t);
                          const TagIcon = tag?.icon;
                          return (
                            <Badge
                              key={t}
                              variant="outline"
                              className="bg-secondary/60"
                            >
                              <View className="flex-row items-center gap-1">
                                {TagIcon && <TagIcon size={12} color="rgb(88, 70, 55)" />}
                                <Text className="text-secondary-foreground text-xs font-normal">
                                  {tag?.label ?? t}
                                </Text>
                              </View>
                            </Badge>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  {/* Audio player */}
                  <AudioPlayer
                    audioUrl={entry.audioUrl}
                    wordTimestamps={entry.wordTimestamps}
                    onPositionChange={(ms) => {
                      if (!entry.wordTimestamps) return;
                      const sec = ms / 1000;
                      let idx = -1;
                      for (let i = 0; i < entry.wordTimestamps.length; i++) {
                        if (sec >= entry.wordTimestamps[i].start) idx = i;
                        else break;
                      }
                      setActiveWordIdx(idx);
                    }}
                  />

                  {/* Transcript */}
                  <View>
                    <View className="flex flex-row items-center justify-between mb-2">
                      <Text className="text-sm font-semibold text-foreground">
                        Transcript
                      </Text>
                      {(entry.transcriptionStatus === "pending" ||
                        entry.transcriptionStatus === "processing") && (
                        <View className="flex flex-row items-center gap-1.5">
                          <Loader2 size={12} color="rgb(130, 110, 90)" className="animate-spin" />
                          <Text className="text-xs text-muted-foreground">
                            Transcribing…
                          </Text>
                        </View>
                      )}
                      {entry.transcriptionStatus === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onPress={handleRetranscribe}
                          disabled={isRetranscribing}
                        >
                          <View className="flex-row items-center gap-1">
                            {isRetranscribing ? (
                              <Loader2 size={12} color="rgb(180, 120, 30)" className="animate-spin" />
                            ) : (
                              <RefreshCw size={12} color="rgb(180, 120, 30)" />
                            )}
                            <Text className="text-amber-700 text-xs">Retry transcription</Text>
                          </View>
                        </Button>
                      )}
                    </View>
                    <TranscriptView
                      transcript={entry.transcript ?? ""}
                      wordTimestamps={entry.wordTimestamps}
                      activeWordIndex={activeWordIdx}
                      editable={isEditing}
                      onChange={setDraftTranscript}
                    />
                    {isEditing && (
                      <Text className="mt-1 text-xs text-muted-foreground">
                        Transcript text edits are not saved yet.
                      </Text>
                    )}
                  </View>

                  {/* Edit panel */}
                  {isEditing && (
                    <View className="rounded-lg border border-border bg-secondary/30 p-4 flex flex-col gap-4 vd-fade">
                      <View>
                        <Label className="text-xs font-medium text-foreground mb-2">
                          Mood
                        </Label>
                        <MoodSelector value={draftMood} onChange={setDraftMood} />
                      </View>
                      <View>
                        <Label className="text-xs font-medium text-foreground mb-2">
                          Tags
                        </Label>
                        <TagPicker selected={draftTags} onChange={setDraftTags} />
                      </View>
                      <View className="flex flex-row justify-end gap-2 pt-1">
                        <Button
                          variant="ghost"
                          onPress={() => setIsEditing(false)}
                          disabled={isSaving}
                        >
                          <Text className="text-foreground font-medium">Cancel</Text>
                        </Button>
                        <Button
                          onPress={handleSave}
                          disabled={isSaving}
                          className="bg-primary"
                        >
                          {isSaving ? (
                            <View className="flex-row items-center gap-2">
                              <Loader2 size={16} color="rgb(250, 246, 238)" className="animate-spin" />
                              <Text className="text-primary-foreground font-medium">Saving…</Text>
                            </View>
                          ) : (
                            <View className="flex-row items-center gap-2">
                              <Save size={16} color="rgb(250, 246, 238)" />
                              <Text className="text-primary-foreground font-medium">Save changes</Text>
                            </View>
                          )}
                        </Button>
                      </View>
                    </View>
                  )}

                  {/* Danger zone */}
                  {!isEditing && (
                    <View className="pt-2 border-t border-border/40 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => setShowDelete(true)}
                      >
                        <View className="flex-row items-center gap-2">
                          <Trash2 size={16} color="rgb(220, 80, 70)" />
                          <Text className="text-destructive font-medium">Delete entry</Text>
                        </View>
                      </Button>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </DialogContent>
      </Dialog>

      <ExportModal
        entryId={selectedEntryId}
        open={showExport}
        onOpenChange={setShowExport}
      />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the audio recording and its transcript.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setShowDelete(false)}>
              <Text className="text-foreground font-medium">Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={handleDelete}
              className="bg-destructive"
            >
              <View className="flex-row items-center gap-2">
                <AlertCircle size={16} color="#ffffff" />
                <Text className="text-destructive-foreground font-medium">Delete</Text>
              </View>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
