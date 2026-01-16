"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type Project, updateProject } from "@/lib/actions/projects";
import { Folder, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  project: Project;
  canEdit?: boolean;
  onClick?: () => void;
  onUpdate?: () => void;
  thumbnailUrl?: string | null;
}

export function ProjectCard({
  project,
  canEdit = false,
  onClick,
  onUpdate,
  thumbnailUrl,
}: ProjectCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [isSaving, setIsSaving] = useState(false);

  const formattedDate = new Date(project.updated_at).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateProject(project.id, {
      name: name.trim() || project.name,
      description: description.trim() || undefined,
    });
    setIsSaving(false);

    if (!result.error) {
      setIsEditing(false);
      onUpdate?.();
    }
  };

  const handleCancel = () => {
    setName(project.name);
    setDescription(project.description || "");
    setIsEditing(false);
  };

  const handleCardClick = () => {
    if (!isEditing) {
      onClick?.();
    }
  };

  return (
    <Card
      className={`transition-all ${
        !isEditing ? "cursor-pointer hover:shadow-md hover:border-primary/50" : ""
      }`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Thumbnail or placeholder */}
        <div className="mb-3 aspect-video rounded-md bg-muted/50 overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={project.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Folder className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div
            className="space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="h-8 text-sm font-medium"
              autoFocus
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="h-8 text-sm"
            />
            <div className="flex gap-1 pt-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="pr-8">
              <h3 className="font-medium truncate">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {project.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Updated {formattedDate}
              </p>
            </div>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-0 right-0 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
