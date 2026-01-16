"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

interface CreateProjectCardProps {
  onClick: () => void;
}

export function CreateProjectCard({ onClick }: CreateProjectCardProps) {
  return (
    <Card
      className="cursor-pointer border-dashed border-2 transition-all hover:border-primary/50 hover:bg-muted/30"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Placeholder matching thumbnail aspect ratio */}
        <div className="mb-3 aspect-video rounded-md bg-muted/30 flex items-center justify-center">
          <Plus className="h-8 w-8 text-muted-foreground/50" />
        </div>

        {/* Content */}
        <div>
          <h3 className="font-medium text-muted-foreground">
            Create New Project
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-0.5">
            Start a new project or set
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
