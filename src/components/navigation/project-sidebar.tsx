"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Folder, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getTeams, Team } from "@/lib/actions/teams";
import { getProjects, Project } from "@/lib/actions/projects";

interface ProjectSidebarProps {
  currentTeamId?: string;
  currentProjectId?: string;
}

interface TeamWithProjects extends Team {
  projects: Project[];
}

export function ProjectSidebar({
  currentTeamId,
  currentProjectId,
}: ProjectSidebarProps) {
  const pathname = usePathname();
  const [teams, setTeams] = useState<TeamWithProjects[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTeamsAndProjects() {
      setIsLoading(true);
      const { data: teamsData } = await getTeams();

      const teamsWithProjects: TeamWithProjects[] = await Promise.all(
        teamsData.map(async (team) => {
          const { data: projects } = await getProjects(team.id);
          return { ...team, projects };
        })
      );

      setTeams(teamsWithProjects);

      // Auto-expand the current team
      if (currentTeamId) {
        setExpandedTeams(new Set([currentTeamId]));
      }

      setIsLoading(false);
    }

    loadTeamsAndProjects();
  }, [currentTeamId]);

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
                      const isCurrentProject = project.id === currentProjectId;
                      const projectPath = `/projects/${project.id}`;
                      const isActive =
                        pathname === projectPath ||
                        pathname.startsWith(`${projectPath}/`);

                      return (
                        <Link
                          key={project.id}
                          href={projectPath}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            isActive && "bg-accent text-accent-foreground font-medium"
                          )}
                        >
                          <Folder className="h-4 w-4 shrink-0" />
                          <span className="truncate">{project.name}</span>
                        </Link>
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
