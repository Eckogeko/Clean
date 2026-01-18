"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Folder, Users, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getTeams, Team } from "@/lib/actions/teams";
import { getProjects, Project } from "@/lib/actions/projects";
import { getVideos, Video as VideoType } from "@/lib/actions/videos";

interface ProjectSidebarProps {
  currentTeamId?: string;
  currentProjectId?: string;
  currentVideoId?: string;
}

interface ProjectWithVideos extends Project {
  videos: VideoType[];
}

interface TeamWithProjects extends Team {
  projects: ProjectWithVideos[];
}

export function ProjectSidebar({
  currentTeamId,
  currentProjectId,
  currentVideoId,
}: ProjectSidebarProps) {
  const pathname = usePathname();
  const [teams, setTeams] = useState<TeamWithProjects[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTeamsProjectsAndVideos() {
      setIsLoading(true);
      const { data: teamsData } = await getTeams();

      const teamsWithProjects: TeamWithProjects[] = await Promise.all(
        teamsData.map(async (team) => {
          const { data: projects } = await getProjects(team.id);

          // Fetch videos for each project
          const projectsWithVideos: ProjectWithVideos[] = await Promise.all(
            projects.map(async (project) => {
              const { data: videos } = await getVideos(project.id);
              return { ...project, videos };
            })
          );

          return { ...team, projects: projectsWithVideos };
        })
      );

      setTeams(teamsWithProjects);

      // Auto-expand the current team
      if (currentTeamId) {
        setExpandedTeams(new Set([currentTeamId]));
      }

      // Auto-expand the current project
      if (currentProjectId) {
        setExpandedProjects(new Set([currentProjectId]));
      }

      setIsLoading(false);
    }

    loadTeamsProjectsAndVideos();
  }, [currentTeamId, currentProjectId]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="w-64 border-r bg-muted/30 p-4">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Teams & Projects
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {teams.map((team) => {
            const isExpanded = expandedTeams.has(team.id);
            const isCurrentTeam = team.id === currentTeamId;

            return (
              <div key={team.id} className="mb-1">
                <button
                  onClick={() => toggleTeam(team.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isCurrentTeam && "bg-accent/50"
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1 text-left">{team.name}</span>
                </button>

                {isExpanded && team.projects.length > 0 && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {team.projects.map((project) => {
                      const isProjectExpanded = expandedProjects.has(project.id);
                      const projectPath = `/projects/${project.id}`;
                      const isActive =
                        pathname === projectPath ||
                        pathname.startsWith(`${projectPath}/`);

                      return (
                        <div key={project.id}>
                          <div className="flex items-center">
                            {project.videos.length > 0 ? (
                              <button
                                onClick={() => toggleProject(project.id)}
                                className="p-0.5 hover:bg-accent rounded"
                              >
                                {isProjectExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4" />
                            )}
                            <Link
                              href={projectPath}
                              className={cn(
                                "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                                "hover:bg-accent hover:text-accent-foreground",
                                isActive && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              <Folder className="h-4 w-4 shrink-0" />
                              <span className="truncate">{project.name}</span>
                            </Link>
                          </div>

                          {isProjectExpanded && project.videos.length > 0 && (
                            <div className="ml-6 mt-0.5 space-y-0.5">
                              {project.videos.map((video) => {
                                const videoPath = `/projects/${project.id}/videos/${video.id}`;
                                const isVideoActive = pathname === videoPath || video.id === currentVideoId;

                                return (
                                  <Link
                                    key={video.id}
                                    href={videoPath}
                                    className={cn(
                                      "flex items-center gap-2 px-2 py-1 rounded-md text-sm transition-colors",
                                      "hover:bg-accent hover:text-accent-foreground",
                                      isVideoActive && "bg-accent text-accent-foreground font-medium"
                                    )}
                                  >
                                    <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="truncate text-xs">{video.title}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isExpanded && team.projects.length === 0 && (
                  <div className="ml-8 py-1.5 text-sm text-muted-foreground">
                    No projects yet
                  </div>
                )}
              </div>
            );
          })}

          {teams.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No teams found
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
