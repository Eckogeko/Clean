"use client";

import { useState, useEffect, useCallback } from "react";
import { Pin, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NoteEditor } from "./note-editor";
import {
  getProjectNotes,
  createProjectNote,
  updateProjectNote,
  deleteProjectNote,
  type ProjectNote,
} from "@/lib/actions/project-notes";
import { cn } from "@/lib/utils";

interface ProjectNotesSectionProps {
  projectId: string;
  canEdit?: boolean;
}

export function ProjectNotesSection({
  projectId,
  canEdit = false,
}: ProjectNotesSectionProps) {
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    const result = await getProjectNotes(projectId);
    if (result.data) {
      setNotes(result.data);
    }
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreate = async (content: string, title?: string) => {
    setIsCreating(true);
    const result = await createProjectNote(projectId, content, title);
    setIsCreating(false);

    if (!result.error) {
      fetchNotes();
    }
  };

  const handleUpdate = async (noteId: string, content: string, title?: string) => {
    const result = await updateProjectNote(noteId, { content, title });
    if (!result.error) {
      setEditingId(null);
      fetchNotes();
    }
  };

  const handleDelete = async (noteId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this note?");
    if (!confirmed) return;

    const result = await deleteProjectNote(noteId);
    if (!result.error) {
      fetchNotes();
    }
  };

  const handleTogglePin = async (note: ProjectNote) => {
    await updateProjectNote(note.id, { is_pinned: !note.is_pinned });
    fetchNotes();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Project Notes
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {canEdit && (
          <>
            <NoteEditor
              placeholder="Add a project note..."
              showTitle
              onSubmit={handleCreate}
              isLoading={isCreating}
            />
            <Separator className="my-4" />
          </>
        )}

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    "p-3 rounded-lg border bg-card",
                    note.is_pinned && "border-primary/50 bg-primary/5"
                  )}
                >
                  {editingId === note.id ? (
                    <NoteEditor
                      initialContent={note.content}
                      initialTitle={note.title || ""}
                      showTitle
                      onSubmit={(content, title) => handleUpdate(note.id, content, title)}
                      onCancel={() => setEditingId(null)}
                      submitLabel="Save"
                    />
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {note.title && (
                            <h4 className="font-medium text-sm mb-1">{note.title}</h4>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        </div>

                        {canEdit && (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className={cn(
                                "h-6 w-6 p-0",
                                note.is_pinned && "text-primary"
                              )}
                              onClick={() => handleTogglePin(note)}
                            >
                              <Pin className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingId(note.id)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(note.created_at)}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
