export type VideoSourceType = "upload" | "youtube" | "external";

export interface ParsedVideoUrl {
  type: VideoSourceType;
  id: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
}

/**
 * Parse external video URLs to extract video ID and generate embed/thumbnail URLs
 */
export function parseVideoUrl(url: string): ParsedVideoUrl {
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        type: "youtube",
        id: videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
    }
  }

  // Generic external URL
  return {
    type: "external",
    id: null,
    embedUrl: null,
    thumbnailUrl: null,
  };
}

/**
 * Format seconds to MM:SS or HH:MM:SS format
 */
export function formatTimestamp(seconds: number): string {
  if (seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Parse timestamp string (MM:SS or HH:MM:SS) back to seconds
 */
export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(":").map(Number);

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }

  return 0;
}

/**
 * Get the embed URL for a video based on its source type
 */
export function getVideoEmbedUrl(
  sourceType: VideoSourceType,
  externalId: string | null,
  externalUrl: string | null
): string | null {
  if (sourceType === "youtube" && externalId) {
    return `https://www.youtube.com/embed/${externalId}`;
  }

  if (sourceType === "external" && externalUrl) {
    return externalUrl;
  }

  return null;
}

/**
 * Get thumbnail URL for external videos
 */
export function getExternalThumbnail(
  type: "youtube",
  videoId: string
): string | null {
  if (type === "youtube") {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  return null;
}

/**
 * Validate if a URL is a supported video URL
 */
export function isValidVideoUrl(url: string): boolean {
  try {
    new URL(url);
    const parsed = parseVideoUrl(url);
    return parsed.type !== "external" || url.startsWith("http");
  } catch {
    return false;
  }
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}
