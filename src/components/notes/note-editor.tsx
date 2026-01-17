"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { formatTimestamp } from "@/lib/utils/video-utils";

interface NoteEditorProps {
  initialContent?: string;
  initialTitle?: string;
  placeholder?: string;
  onSubmit: (content: string, title?: string) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  showTitle?: boolean;
  showTimestamp?: boolean;
  currentTime?: number;
  submitLabel?: string;
}

export function NoteEditor({
  initialContent = "",
  initialTitle = "",
  placeholder = "Add a note...",
  onSubmit,
  onCancel,
  isLoading = false,
  showTitle = false,
  showTimestamp = false,
  currentTime = 0,
  submitLabel = "Add",
}: NoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await onSubmit(content.trim(), showTitle ? title.trim() : undefined);
    setContent("");
    setTitle("");
    setIsFocused(false);
  };

  const handleCancel = () => {
    setContent(initialContent);
    setTitle(initialTitle);
    setIsFocused(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  const showActions = isFocused || content !== initialContent || title !== initialTitle;

  return (
    <div className="space-y-2">
      {showTitle && (
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="text-sm"
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
        />
      )}

      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="min-h-[80px] resize-none text-sm"
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
        />

        {showTimestamp && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(currentTime)}</span>
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Press ⌘+Enter to submit
          </p>
          <div className="flex gap-2">
            {onCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isLoading || !content.trim()}
            >
              {isLoading ? "Saving..." : submitLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
