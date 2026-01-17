"use client";

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { type Video } from "@/lib/actions/videos";
import { getVideoEmbedUrl } from "@/lib/utils/video-utils";

export interface VideoPlayerRef {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
}

interface VideoPlayerProps {
  video: Video;
  playbackUrl?: string | null;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  function VideoPlayer({ video, playbackUrl, onTimeUpdate, onDurationChange }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = seconds;
          videoRef.current.play();
        }
        // For embedded videos, we can't easily control playback
        // This would require the YouTube/Vimeo Player APIs
      },
      getCurrentTime: () => {
        return videoRef.current?.currentTime ?? 0;
      },
    }));

    useEffect(() => {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      const handleTimeUpdate = () => {
        onTimeUpdate?.(videoElement.currentTime);
      };

      const handleDurationChange = () => {
        onDurationChange?.(videoElement.duration);
      };

      videoElement.addEventListener("timeupdate", handleTimeUpdate);
      videoElement.addEventListener("durationchange", handleDurationChange);

      return () => {
        videoElement.removeEventListener("timeupdate", handleTimeUpdate);
        videoElement.removeEventListener("durationchange", handleDurationChange);
      };
    }, [onTimeUpdate, onDurationChange]);

    // For uploaded videos, use native HTML5 video player
    if (video.source_type === "upload" && playbackUrl) {
      return (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={playbackUrl}
            controls
            className="w-full h-full"
            playsInline
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // For external videos, use iframe embed
    const embedUrl = getVideoEmbedUrl(
      video.source_type,
      video.external_id,
      video.external_url
    );

    if (embedUrl && (video.source_type === "youtube" || video.source_type === "vimeo")) {
      // Add parameters for better embed experience
      const enhancedUrl = new URL(embedUrl);
      if (video.source_type === "youtube") {
        enhancedUrl.searchParams.set("rel", "0"); // Don't show related videos
        enhancedUrl.searchParams.set("modestbranding", "1");
        enhancedUrl.searchParams.set("enablejsapi", "1"); // Enable JS API for future control
      }

      return (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            ref={iframeRef}
            src={enhancedUrl.toString()}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      );
    }

    // For generic external URLs, try to embed as video
    if (video.external_url) {
      return (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={video.external_url}
            controls
            className="w-full h-full"
            playsInline
          >
            <p className="text-white text-center p-4">
              Your browser does not support this video format.{" "}
              <a
                href={video.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Open in new tab
              </a>
            </p>
          </video>
        </div>
      );
    }

    // Fallback for missing video source
    return (
      <div className="relative aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Video not available</p>
      </div>
    );
  }
);
