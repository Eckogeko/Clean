"use client";

import { useState } from "react";
import { Pencil, Trash2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTimestamp } from "@/lib/utils/video-utils";
import { type VideoNote, updateVideoNote, deleteVideoNote } from "@/lib/actions/video-notes";

interface TimestampNoteItemProps {
  note: VideoNote;
  canEdit?: boolean;
  onClick?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export function TimestampNoteItem({
  note,
  canEdit = false,
  onClick,
  onUpdate,
  onDelete,
}: TimestampNoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    const result = await updateVideoNote(note.id, content.trim());
    setIsSaving(false);

    if (!result.error) {
      setIsEditing(false);
      onUpdate?.();
    }
  };

  const handleCancel = () => {
    setContent(note.content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this timestamp note?");
    if (!confirmed) return;

    const result = await deleteVideoNote(note.id);
    if (!result.error) {
      onDelete?.();
    }
  };

  const timestamp = note.timestamp_seconds ?? 0;

  if (isEditing) {
    return (
      <div className="flex gap-2 p-2 rounded-lg border bg-card">
        <Badge variant="secondary" className="shrink-0 h-6">
          {formatTimestamp(timestamp)}
        </Badge>
        <div className="flex-1 space-y-2">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="group flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors">
        <Badge
          variant="secondary"
          className="shrink-0 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={onClick}
        >
          {formatTimestamp(timestamp)}
        </Badge>

        {note.screenshot_url && (
          <button
            type="button"
            className="shrink-0 w-12 h-9 rounded overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
            onClick={() => setShowScreenshot(true)}
          >
            <img
              src={note.screenshot_url}
              alt="Screenshot"
              className="w-full h-full object-cover"
            />
          </button>
        )}

        <p className="flex-1 text-sm">{note.content}</p>

        {canEdit && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Screenshot preview dialog */}
      {note.screenshot_url && (
        <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Screenshot at {formatTimestamp(timestamp)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <img
                src={note.screenshot_url}
                alt="Screenshot"
                className="w-full rounded-lg"
              />
              <p className="text-sm text-muted-foreground">{note.content}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
