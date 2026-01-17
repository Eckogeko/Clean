"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/utils/video-utils";

interface UploadProgressProps {
  progress: number;
  fileName: string;
  fileSize?: number;
  onCancel?: () => void;
}

export function UploadProgress({
  progress,
  fileName,
  fileSize,
  onCancel,
}: UploadProgressProps) {
  const isComplete = progress >= 100;

  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0 mr-4">
          <p className="font-medium truncate">{fileName}</p>
          {fileSize && (
            <p className="text-sm text-muted-foreground">
              {formatFileSize(fileSize)}
            </p>
          )}
        </div>

        {onCancel && !isComplete && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Progress value={progress} className="h-2" />

      <p className="text-xs text-muted-foreground mt-2">
        {isComplete ? "Upload complete" : `Uploading... ${Math.round(progress)}%`}
      </p>
    </div>
  );
}
