"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NoteEditor } from "./note-editor";
import { TimestampNoteItem } from "./timestamp-note-item";
import { CommentItem } from "./comment-item";
import {
  getVideoNotes,
  createVideoNote,
  type VideoNote,
} from "@/lib/actions/video-notes";

interface VideoNotesPanelProps {
  videoId: string;
  currentTime?: number;
  canEdit?: boolean;
  onTimestampClick?: (seconds: number) => void;
  supportsTimestamps?: boolean;
  refreshKey?: number;
}

export function VideoNotesPanel({
  videoId,
  currentTime = 0,
  canEdit = false,
  onTimestampClick,
  supportsTimestamps = true,
  refreshKey,
}: VideoNotesPanelProps) {
  const [comments, setComments] = useState<VideoNote[]>([]);
  const [timestamps, setTimestamps] = useState<VideoNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [isCreatingTimestamp, setIsCreatingTimestamp] = useState(false);

  const fetchNotes = useCallback(async () => {
    const [commentsResult, timestampsResult] = await Promise.all([
      getVideoNotes(videoId, "comment"),
      getVideoNotes(videoId, "timestamp"),
    ]);

    if (commentsResult.data) {
      setComments(commentsResult.data);
    }
    if (timestampsResult.data) {
      setTimestamps(timestampsResult.data);
    }
    setIsLoading(false);
  }, [videoId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes, refreshKey]);

  const handleCreateComment = async (content: string) => {
    setIsCreatingComment(true);
    const result = await createVideoNote(videoId, content, "comment");
    setIsCreatingComment(false);

    if (!result.error) {
      fetchNotes();
    }
  };

  const handleCreateTimestamp = async (content: string) => {
    setIsCreatingTimestamp(true);
    const result = await createVideoNote(
      videoId,
      content,
      "timestamp",
      Math.floor(currentTime)
    );
    setIsCreatingTimestamp(false);

    if (!result.error) {
      fetchNotes();
    }
  };

  const handleTimestampClick = (note: VideoNote) => {
    if (note.timestamp_seconds !== null && onTimestampClick) {
      onTimestampClick(note.timestamp_seconds);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Notes</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 pt-4">
        <Tabs defaultValue="comments" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comments" className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Comments ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="timestamps" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Timestamps ({timestamps.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comments" className="flex-1 flex flex-col mt-4">
            {canEdit && (
              <>
                <NoteEditor
                  placeholder="Add a comment..."
                  onSubmit={handleCreateComment}
                  isLoading={isCreatingComment}
                />
                <Separator className="my-4" />
              </>
            )}

            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {comments.map((note) => (
                    <CommentItem
                      key={note.id}
                      note={note}
                      canEdit={canEdit}
                      onUpdate={fetchNotes}
                      onDelete={fetchNotes}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="timestamps" className="flex-1 flex flex-col mt-4">
            {!supportsTimestamps ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Timestamps not available</p>
                <p className="text-xs mt-1">
                  Timestamp tracking is not supported for external videos.
                  <br />
                  Use YouTube or upload a video file to use timestamp notes.
                </p>
              </div>
            ) : (
              <>
                {canEdit && (
                  <>
                    <NoteEditor
                      placeholder="Add a note at current time..."
                      showTimestamp
                      currentTime={currentTime}
                      onSubmit={handleCreateTimestamp}
                      isLoading={isCreatingTimestamp}
                    />
                    <Separator className="my-4" />
                  </>
                )}

                <ScrollArea className="flex-1">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : timestamps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No timestamp notes yet</p>
                      <p className="text-xs mt-1">Play the video and add notes at specific moments</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {timestamps.map((note) => (
                        <TimestampNoteItem
                          key={note.id}
                          note={note}
                          canEdit={canEdit}
                          onClick={() => handleTimestampClick(note)}
                          onUpdate={fetchNotes}
                          onDelete={fetchNotes}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
