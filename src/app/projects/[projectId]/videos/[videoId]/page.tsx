"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { ProjectHeader } from "@/components/project/project-header";
import { ProjectSidebar } from "@/components/navigation/project-sidebar";
import { VideoPlayer, VideoPlayerRef } from "@/components/video/video-player";
import { VideoNotesPanel } from "@/components/notes/video-notes-panel";
import { ScreenshotButton } from "@/components/video/screenshot-button";
import { getProject, type Project } from "@/lib/actions/projects";
import { getTeam, type Team } from "@/lib/actions/teams";
import { getVideo, getVideoPlaybackUrl, type Video } from "@/lib/actions/videos";
import { getCurrentUserRole } from "@/lib/actions/team-members";
import { type BreadcrumbItem } from "@/components/navigation/breadcrumbs";

export default function VideoPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const videoId = params.videoId as string;

  const playerRef = useRef<VideoPlayerRef>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"owner" | "director" | "dancer" | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const videoResult = await getVideo(videoId);
    if (videoResult.error || !videoResult.data) {
      setIsLoading(false);
      return;
    }

    const videoData = videoResult.data;
    setVideo(videoData);

    // Fetch playback URL for uploaded videos
    if (videoData.source_type === "upload") {
      const urlResult = await getVideoPlaybackUrl(videoId);
      if (urlResult.data) {
        setPlaybackUrl(urlResult.data);
      }
    }

    const projectResult = await getProject(projectId);
    if (projectResult.error || !projectResult.data) {
      setIsLoading(false);
      return;
    }

    const projectData = projectResult.data;
    setProject(projectData);

    const [teamResult, roleResult] = await Promise.all([
      getTeam(projectData.team_id),
      getCurrentUserRole(projectData.team_id),
    ]);

    if (teamResult.data) {
      setTeam(teamResult.data);
    }
    if (roleResult.role) {
      setUserRole(roleResult.role);
    }

    setIsLoading(false);
  }, [projectId, videoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTimestampClick = (seconds: number) => {
    playerRef.current?.seekTo(seconds);
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const canEdit = userRole === "owner" || userRole === "director";

  const handleScreenshotSaved = () => {
    setNotesRefreshKey((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 border-r bg-muted/30 animate-pulse" />
        <div className="flex-1 p-8">
          <div className="aspect-video bg-muted animate-pulse rounded-lg mb-4" />
          <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!video || !project || !team) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Video not found</p>
      </div>
    );
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: team.name, href: "/" },
    { label: project.name, href: `/projects/${projectId}` },
    { label: video.title },
  ];

  return (
    <div className="flex h-screen flex-col">
      <ProjectHeader
        projectName={video.title}
        breadcrumbItems={breadcrumbs}
      />

      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar
          currentTeamId={team.id}
          currentProjectId={project.id}
        />

        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <div className="flex gap-6">
              {/* Main content - Video Player */}
              <div className="flex-1 min-w-0">
                <VideoPlayer
                  ref={playerRef}
                  video={video}
                  playbackUrl={playbackUrl}
                  onTimeUpdate={handleTimeUpdate}
                />

                {/* Video toolbar */}
                <div className="mt-4 flex items-center gap-4">
                  <ScreenshotButton
                    playerRef={playerRef}
                    videoId={videoId}
                    sourceType={video.source_type}
                    canEdit={canEdit}
                    onScreenshotSaved={handleScreenshotSaved}
                  />
                </div>

                <div className="mt-4">
                  <h1 className="text-xl font-bold">{video.title}</h1>
                  {video.description && (
                    <p className="text-muted-foreground mt-2">
                      {video.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Sidebar - Video Notes */}
              <aside className="w-96 shrink-0 hidden lg:block">
                <VideoNotesPanel
                  videoId={videoId}
                  currentTime={currentTime}
                  canEdit={canEdit}
                  onTimestampClick={handleTimestampClick}
                  supportsTimestamps={video.source_type !== "vimeo"}
                  refreshKey={notesRefreshKey}
                />
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
