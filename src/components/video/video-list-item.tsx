"use client";

import { useState } from "react";
import { Video as VideoIcon, Youtube, Clock, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Video, updateVideo, deleteVideo } from "@/lib/actions/videos";
import { formatDuration, formatFileSize } from "@/lib/utils/video-utils";
import { cn } from "@/lib/utils";

interface VideoListItemProps {
  video: Video;
  canEdit?: boolean;
  onClick?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}

function getSourceIcon(sourceType: string) {
  switch (sourceType) {
    case "youtube":
      return <Youtube className="h-4 w-4 text-red-500" />;
    case "vimeo":
      return <VideoIcon className="h-4 w-4 text-blue-500" />;
    case "external":
      return <ExternalLink className="h-4 w-4 text-muted-foreground" />;
    default:
      return <VideoIcon className="h-4 w-4 text-muted-foreground" />;
  }
}

export function VideoListItem({
  video,
  canEdit = false,
  onClick,
  onUpdate,
  onDelete,
}: VideoListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateVideo(video.id, {
      title: title.trim() || video.title,
      description: description.trim() || undefined,
    });
    setIsSaving(false);

    if (!result.error) {
      setIsEditing(false);
      onUpdate?.();
    }
  };

  const handleCancel = () => {
    setTitle(video.title);
    setDescription(video.description || "");
    setIsEditing(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete "${video.title}"? This will also delete all notes and comments. This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    const result = await deleteVideo(video.id);
    setIsDeleting(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    onDelete?.();
  };

  const formattedDate = new Date(video.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "flex gap-4 p-4 rounded-lg border bg-card transition-colors",
        !isEditing && "cursor-pointer hover:bg-accent/50"
      )}
      onClick={() => !isEditing && onClick?.()}
    >
      {/* Thumbnail */}
      <div className="w-40 h-24 shrink-0 rounded-md bg-muted overflow-hidden">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <VideoIcon className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title"
              className="h-8"
              autoFocus
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="h-8"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium truncate">{video.title}</h3>
                {video.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {video.description}
                  </p>
                )}
              </div>

              {canEdit && (
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                {getSourceIcon(video.source_type)}
                <span className="capitalize">{video.source_type}</span>
              </div>

              {video.duration_seconds && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDuration(video.duration_seconds)}</span>
                </div>
              )}

              {video.file_size_bytes && (
                <span>{formatFileSize(video.file_size_bytes)}</span>
              )}

              <span>{formattedDate}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
