"use client";

import { useRef, forwardRef, useImperativeHandle, useEffect, useCallback, useState } from "react";
import { type Video } from "@/lib/actions/videos";

// Extend Window interface for YouTube IFrame API
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
}

// Track if the API script is loaded
let youtubeApiLoaded = false;
let youtubeApiLoading = false;
const youtubeApiCallbacks: (() => void)[] = [];

function loadYouTubeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (youtubeApiLoaded) {
      resolve();
      return;
    }

    youtubeApiCallbacks.push(resolve);

    if (youtubeApiLoading) {
      return;
    }

    youtubeApiLoading = true;

    // Set up the callback before loading the script
    window.onYouTubeIframeAPIReady = () => {
      youtubeApiLoaded = true;
      youtubeApiLoading = false;
      youtubeApiCallbacks.forEach((cb) => cb());
      youtubeApiCallbacks.length = 0;
    };

    // Load the script
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
}

export interface VideoPlayerRef {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getVideoElement: () => HTMLVideoElement | null;
  pause: () => void;
}

interface VideoPlayerProps {
  video: Video;
  playbackUrl?: string | null;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
}

// YouTube Player Component
interface YouTubePlayerProps {
  videoId: string;
  title: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  playerRef?: React.RefObject<YTPlayer | null>;
}

function YouTubePlayer({ videoId, title, onTimeUpdate, onDurationChange, playerRef }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalPlayerRef = useRef<YTPlayer | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Store callbacks in refs
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onDurationChangeRef = useRef(onDurationChange);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    onDurationChangeRef.current = onDurationChange;
  }, [onDurationChange]);

  useEffect(() => {
    let mounted = true;

    const initPlayer = async () => {
      await loadYouTubeApi();

      if (!mounted || !containerRef.current) return;

      // Create a unique ID for this player
      const playerId = `youtube-player-${videoId}-${Date.now()}`;
      containerRef.current.id = playerId;

      new window.YT.Player(playerId, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (!mounted) return;
            internalPlayerRef.current = event.target;
            if (playerRef) {
              playerRef.current = event.target;
            }
            setIsReady(true);

            // Get duration when ready
            const duration = event.target.getDuration();
            if (duration > 0) {
              onDurationChangeRef.current?.(duration);
            }
          },
          onStateChange: (event) => {
            if (!mounted) return;

            // Send immediate time update on any state change
            if (internalPlayerRef.current) {
              const currentTime = internalPlayerRef.current.getCurrentTime();
              onTimeUpdateRef.current?.(currentTime);
            }

            // When playing, poll faster for smoother updates
            // When paused, poll slower but keep polling so users can scrub and add notes
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (timeUpdateIntervalRef.current) {
                clearInterval(timeUpdateIntervalRef.current);
              }
              // Poll every 250ms while playing for smooth updates
              timeUpdateIntervalRef.current = setInterval(() => {
                if (internalPlayerRef.current) {
                  const currentTime = internalPlayerRef.current.getCurrentTime();
                  onTimeUpdateRef.current?.(currentTime);
                }
              }, 250);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              if (timeUpdateIntervalRef.current) {
                clearInterval(timeUpdateIntervalRef.current);
              }
              // Poll every 500ms while paused to catch scrubbing
              timeUpdateIntervalRef.current = setInterval(() => {
                if (internalPlayerRef.current) {
                  const currentTime = internalPlayerRef.current.getCurrentTime();
                  onTimeUpdateRef.current?.(currentTime);
                }
              }, 500);
            } else {
              // Ended or other states - stop polling
              if (timeUpdateIntervalRef.current) {
                clearInterval(timeUpdateIntervalRef.current);
                timeUpdateIntervalRef.current = null;
              }
            }
          },
        },
      });
    };

    initPlayer();

    return () => {
      mounted = false;
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      if (internalPlayerRef.current) {
        try {
          internalPlayerRef.current.destroy();
        } catch {
          // Player may already be destroyed
        }
      }
    };
  }, [videoId, playerRef]);

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white text-sm">Loading {title}...</div>
        </div>
      )}
    </div>
  );
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  function VideoPlayer({ video, playbackUrl, onTimeUpdate, onDurationChange }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const ytPlayerRef = useRef<YTPlayer | null>(null);

    // Store callbacks in refs to avoid stale closures
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onDurationChangeRef = useRef(onDurationChange);

    // Keep refs in sync with props
    useEffect(() => {
      onTimeUpdateRef.current = onTimeUpdate;
    }, [onTimeUpdate]);

    useEffect(() => {
      onDurationChangeRef.current = onDurationChange;
    }, [onDurationChange]);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = seconds;
          videoRef.current.play();
        } else if (ytPlayerRef.current) {
          ytPlayerRef.current.seekTo(seconds, true);
          ytPlayerRef.current.playVideo();
        }
      },
      getCurrentTime: () => {
        if (videoRef.current) {
          return videoRef.current.currentTime;
        }
        if (ytPlayerRef.current) {
          return ytPlayerRef.current.getCurrentTime();
        }
        return 0;
      },
      getVideoElement: () => {
        return videoRef.current;
      },
      pause: () => {
        if (videoRef.current) {
          videoRef.current.pause();
        } else if (ytPlayerRef.current) {
          ytPlayerRef.current.pauseVideo();
        }
      },
    }));

    // Event handlers that read from refs (defined first so they can be used in setVideoRef)
    const handleTimeUpdate = useCallback(() => {
      if (videoRef.current) {
        onTimeUpdateRef.current?.(videoRef.current.currentTime);
      }
    }, []);

    const handleDurationChange = useCallback(() => {
      if (videoRef.current) {
        onDurationChangeRef.current?.(videoRef.current.duration);
      }
    }, []);

    // Set up event listeners using a callback ref pattern
    const setVideoRef = useCallback((element: HTMLVideoElement | null) => {
      // Clean up old listeners if we had a previous element
      if (videoRef.current && videoRef.current !== element) {
        const oldElement = videoRef.current;
        oldElement.removeEventListener("timeupdate", handleTimeUpdate);
        oldElement.removeEventListener("durationchange", handleDurationChange);
      }

      videoRef.current = element;

      if (element) {
        element.addEventListener("timeupdate", handleTimeUpdate);
        element.addEventListener("durationchange", handleDurationChange);
      }
    }, [handleTimeUpdate, handleDurationChange]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener("timeupdate", handleTimeUpdate);
          videoRef.current.removeEventListener("durationchange", handleDurationChange);
        }
      };
    }, [handleTimeUpdate, handleDurationChange]);

    // For uploaded videos, use native HTML5 video player
    if (video.source_type === "upload" && playbackUrl) {
      return (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={setVideoRef}
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

    // For YouTube videos, use the YouTube IFrame API
    if (video.source_type === "youtube" && video.external_id) {
      return (
        <YouTubePlayer
          videoId={video.external_id}
          title={video.title}
          onTimeUpdate={onTimeUpdate}
          onDurationChange={onDurationChange}
          playerRef={ytPlayerRef}
        />
      );
    }

    // For Vimeo videos, use iframe (Vimeo API would require similar treatment)
    if (video.source_type === "vimeo" && video.external_id) {
      const embedUrl = `https://player.vimeo.com/video/${video.external_id}`;
      return (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            src={embedUrl}
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
            ref={setVideoRef}
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
