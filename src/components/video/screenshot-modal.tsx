"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { formatTimestamp } from "@/lib/utils/video-utils";
import { getScreenshotUploadUrl, getScreenshotPublicUrl } from "@/lib/actions/screenshots";
import { createVideoNote } from "@/lib/actions/video-notes";

interface ScreenshotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshotBlob: Blob | null;
  timestamp: number;
  videoId: string;
  onSaved?: () => void;
}

export function ScreenshotModal({
  open,
  onOpenChange,
  screenshotBlob,
  timestamp,
  videoId,
  onSaved,
}: ScreenshotModalProps) {
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = screenshotBlob ? URL.createObjectURL(screenshotBlob) : null;

  const handleSave = async () => {
    if (!screenshotBlob || !note.trim()) {
      setError("Please add a note for the screenshot");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Get signed upload URL
      const uploadUrlResult = await getScreenshotUploadUrl(videoId, Math.floor(timestamp));
      if (uploadUrlResult.error || !uploadUrlResult.data) {
        setError(uploadUrlResult.error || "Failed to get upload URL");
        setIsSaving(false);
        return;
      }

      const { path, signedUrl, token } = uploadUrlResult.data;

      // Upload the screenshot
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "image/png",
          ...(token ? { "x-upsert": "true" } : {}),
        },
        body: screenshotBlob,
      });

      if (!uploadResponse.ok) {
        setError("Failed to upload screenshot");
        setIsSaving(false);
        return;
      }

      // Get the public URL for the uploaded screenshot
      const publicUrlResult = await getScreenshotPublicUrl(path);
      if (!publicUrlResult.data) {
        setError("Failed to get screenshot URL");
        setIsSaving(false);
        return;
      }

      // Create the timestamp note with screenshot
      const noteResult = await createVideoNote(
        videoId,
        note.trim(),
        "timestamp",
        Math.floor(timestamp),
        publicUrlResult.data
      );

      if (noteResult.error) {
        setError(noteResult.error);
        setIsSaving(false);
        return;
      }

      // Success - reset and close
      setNote("");
      setIsSaving(false);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError("An unexpected error occurred");
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setNote("");
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Add Screenshot Note
          </DialogTitle>
          <DialogDescription>
            Add a note to describe this screenshot at the current timestamp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {previewUrl && (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Screenshot preview"
                className="w-full rounded-lg border"
              />
              <Badge className="absolute bottom-2 left-2" variant="secondary">
                {formatTimestamp(timestamp)}
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              placeholder="Describe what's happening in this frame..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={isSaving}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !note.trim()}>
            {isSaving ? "Saving..." : "Save Screenshot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
