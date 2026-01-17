"use client";

import { useRouter } from "next/navigation";
import { VideoListItem } from "./video-list-item";
import { type Video } from "@/lib/actions/videos";
import { VideoIcon } from "lucide-react";

interface VideoListProps {
  projectId: string;
  videos: Video[];
  canEdit?: boolean;
  onVideoDeleted?: () => void;
  onVideoUpdated?: () => void;
}

export function VideoList({
  projectId,
  videos,
  canEdit = false,
  onVideoDeleted,
  onVideoUpdated,
}: VideoListProps) {
  const router = useRouter();

  const handleVideoClick = (video: Video) => {
    router.push(`/projects/${projectId}/videos/${video.id}`);
  };

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <VideoIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No videos yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a video or add a link to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {videos.map((video) => (
        <div key={video.id} className="group">
          <VideoListItem
            video={video}
            canEdit={canEdit}
            onClick={() => handleVideoClick(video)}
            onUpdate={onVideoUpdated}
            onDelete={onVideoDeleted}
          />
        </div>
      ))}
    </div>
  );
}
