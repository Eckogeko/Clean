"use client";

import { useEffect, useState, useCallback } from "react";
import { ProjectCard } from "./project-card";
import { CreateProjectCard } from "./create-project-card";
import { CreateProjectDialog } from "./create-project-dialog";
import { getProjects, type Project } from "@/lib/actions/projects";

interface ProjectGridProps {
  teamId: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ProjectGrid({ teamId, canEdit = false, canDelete = false }: ProjectGridProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!teamId) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    const result = await getProjects(teamId);
    if (result.data) {
      setProjects(result.data);
    }
    setIsLoading(false);
  }, [teamId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectClick = (project: Project) => {
    // TODO: Navigate to project detail page
    console.log("Project clicked:", project.id);
  };

  if (!teamId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Select a team to view projects
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading projects...
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Create New Project card always first */}
        <CreateProjectCard onClick={() => setIsCreateDialogOpen(true)} />

        {/* Existing projects sorted by most recently updated */}
        {projects.map((project) => (
          <div key={project.id} className="group">
            <ProjectCard
              project={project}
              canEdit={canEdit}
              canDelete={canDelete}
              onClick={() => handleProjectClick(project)}
              onUpdate={fetchProjects}
              onDelete={fetchProjects}
            />
          </div>
        ))}
      </div>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        teamId={teamId}
        onProjectCreated={fetchProjects}
      />
    </>
  );
}
