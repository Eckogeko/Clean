"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectHeader } from "@/components/project/project-header";
import { ProjectSidebar } from "@/components/navigation/project-sidebar";
import { VideoList } from "@/components/video/video-list";
import { VideoUploadDialog } from "@/components/video/video-upload-dialog";
import { ProjectNotesSection } from "@/components/notes/project-notes-section";
import { getProject, type Project } from "@/lib/actions/projects";
import { getTeam, type Team } from "@/lib/actions/teams";
import { getVideos, type Video } from "@/lib/actions/videos";
import { getCurrentUserRole } from "@/lib/actions/team-members";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [userRole, setUserRole] = useState<"owner" | "director" | "dancer" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const projectResult = await getProject(projectId);
    if (projectResult.error || !projectResult.data) {
      setIsLoading(false);
      return;
    }

    const projectData = projectResult.data;
    setProject(projectData);

    const [teamResult, videosResult, roleResult] = await Promise.all([
      getTeam(projectData.team_id),
      getVideos(projectId),
      getCurrentUserRole(projectData.team_id),
    ]);

    if (teamResult.data) {
      setTeam(teamResult.data);
    }
    if (videosResult.data) {
      setVideos(videosResult.data);
    }
    if (roleResult.role) {
      setUserRole(roleResult.role);
    }

    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const canEdit = userRole === "owner" || userRole === "director";

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 border-r bg-muted/30 animate-pulse" />
        <div className="flex-1 p-8">
          <div className="h-8 bg-muted animate-pulse rounded w-1/3 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project || !team) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <ProjectHeader
        projectName={project.name}
        teamName={team.name}
      >
        {canEdit && (
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Video
          </Button>
        )}
      </ProjectHeader>

      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar
          currentTeamId={team.id}
          currentProjectId={project.id}
        />

        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <div className="flex gap-6">
              {/* Main content - Video List */}
              <div className="flex-1 min-w-0">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">{project.name}</h1>
                  {project.description && (
                    <p className="text-muted-foreground mt-1">
                      {project.description}
                    </p>
                  )}
                </div>

                <VideoList
                  projectId={projectId}
                  videos={videos}
                  canEdit={canEdit}
                  onVideoDeleted={fetchData}
                  onVideoUpdated={fetchData}
                />
              </div>

              {/* Sidebar - Project Notes */}
              <aside className="w-80 shrink-0 hidden lg:block">
                <ProjectNotesSection
                  projectId={projectId}
                  canEdit={canEdit}
                />
              </aside>
            </div>
          </div>
        </main>
      </div>

      <VideoUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        projectId={projectId}
        onVideoCreated={fetchData}
      />
    </div>
  );
}
