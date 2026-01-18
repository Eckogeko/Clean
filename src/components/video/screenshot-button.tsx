"use client";

import { useState, useCallback } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ScreenshotModal } from "./screenshot-modal";
import type { VideoPlayerRef } from "./video-player";
import type { VideoSourceType } from "@/lib/actions/videos";

interface ScreenshotButtonProps {
  playerRef: React.RefObject<VideoPlayerRef | null>;
  videoId: string;
  sourceType: VideoSourceType;
  canEdit: boolean;
  onScreenshotSaved?: () => void;
}

export function ScreenshotButton({
  playerRef,
  videoId,
  sourceType,
  canEdit,
  onScreenshotSaved,
}: ScreenshotButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [timestamp, setTimestamp] = useState(0);

  const isUploadedVideo = sourceType === "upload";
  const isDisabled = !isUploadedVideo || !canEdit;

  const captureScreenshot = useCallback(() => {
    if (!playerRef.current) return;

    const videoElement = playerRef.current.getVideoElement();
    if (!videoElement) return;

    // Pause the video
    playerRef.current.pause();

    // Get current timestamp
    const currentTime = playerRef.current.getCurrentTime();
    setTimestamp(currentTime);

    // Create canvas and capture frame
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setScreenshotBlob(blob);
          setModalOpen(true);
        }
      },
      "image/png",
      1.0
    );
  }, [playerRef]);

  const handleClick = () => {
    if (!isDisabled) {
      captureScreenshot();
    }
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      // Clean up blob URL when modal closes
      setScreenshotBlob(null);
    }
  };

  // Don't render if user can't edit
  if (!canEdit) {
    return null;
  }

  // Render disabled button with tooltip for non-uploaded videos
  if (!isUploadedVideo) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Screenshot
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Screenshots are only available for uploaded videos
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="gap-2"
      >
        <Camera className="h-4 w-4" />
        Screenshot
      </Button>

      <ScreenshotModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        screenshotBlob={screenshotBlob}
        timestamp={timestamp}
        videoId={videoId}
        onSaved={onScreenshotSaved}
      />
    </>
  );
}
