"use server";

import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export type VideoNote = {
  id: string;
  video_id: string;
  note_type: "comment" | "timestamp";
  content: string;
  timestamp_seconds: number | null;
  screenshot_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

async function getVideoProjectId(videoId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select("project_id")
    .eq("id", videoId)
    .single();
  return data?.project_id;
}

async function checkVideoPermission(
  videoId: string,
  userId: string,
  permission: "view" | "edit"
) {
  const supabase = await createClient();

  // Get video's project and then team
  const { data: video } = await supabase
    .from("videos")
    .select("project_id")
    .eq("id", videoId)
    .single();

  if (!video) return false;

  const { data: project } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", video.project_id)
    .single();

  if (!project) return false;

  // Check user's role in the team
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .single();

  if (!membership) return false;

  if (permission === "view") {
    return true; // All team members can view
  }

  // Edit requires owner or director
  return membership.role === "owner" || membership.role === "director";
}

export async function getVideoNotes(
  videoId: string,
  noteType?: "comment" | "timestamp"
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized", data: [] };
  }

  const hasPermission = await checkVideoPermission(videoId, userId, "view");
  if (!hasPermission) {
    return { error: "Access denied", data: [] };
  }

  const supabase = await createClient();

  let query = supabase
    .from("video_notes")
    .select("*")
    .eq("video_id", videoId);

  if (noteType) {
    query = query.eq("note_type", noteType);
  }

  // Order timestamps by time, comments by creation date
  if (noteType === "timestamp") {
    query = query.order("timestamp_seconds", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message, data: [] };
  }

  return { data: (data as VideoNote[]) ?? [] };
}

export async function getVideoNote(noteId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("video_notes")
    .select("*")
    .eq("id", noteId)
    .single();

  if (error) {
    return { error: error.message };
  }

  const note = data as VideoNote;

  const hasPermission = await checkVideoPermission(note.video_id, userId, "view");
  if (!hasPermission) {
    return { error: "Access denied" };
  }

  return { data: note };
}

export async function createVideoNote(
  videoId: string,
  content: string,
  noteType: "comment" | "timestamp",
  timestampSeconds?: number,
  screenshotUrl?: string
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  // All team members can add comments, but only owners/directors can add timestamp notes
  const requiredPermission = noteType === "timestamp" ? "edit" : "view";
  const hasPermission = await checkVideoPermission(videoId, userId, requiredPermission);
  if (!hasPermission) {
    const errorMsg = noteType === "timestamp"
      ? "Only owners and directors can add timestamp notes"
      : "Access denied";
    return { error: errorMsg };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("video_notes")
    .insert({
      video_id: videoId,
      content,
      note_type: noteType,
      timestamp_seconds: noteType === "timestamp" ? timestampSeconds : null,
      screenshot_url: noteType === "timestamp" ? screenshotUrl : null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  const projectId = await getVideoProjectId(videoId);
  if (projectId) {
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
  }

  return { data: data as VideoNote };
}

export async function updateVideoNote(noteId: string, content: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get the note to check ownership and permissions
  const { data: note } = await supabase
    .from("video_notes")
    .select("video_id, created_by")
    .eq("id", noteId)
    .single();

  if (!note) {
    return { error: "Note not found" };
  }

  // User can edit their own notes, or owners/directors can edit any note
  const isOwner = note.created_by === userId;
  const hasEditPermission = await checkVideoPermission(note.video_id, userId, "edit");

  if (!isOwner && !hasEditPermission) {
    return { error: "You can only edit your own notes" };
  }

  const { data, error } = await supabase
    .from("video_notes")
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  const projectId = await getVideoProjectId(note.video_id);
  if (projectId) {
    revalidatePath(`/projects/${projectId}/videos/${note.video_id}`);
  }

  return { data: data as VideoNote };
}

export async function deleteVideoNote(noteId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get the note to check ownership and permissions
  const { data: note } = await supabase
    .from("video_notes")
    .select("video_id, created_by")
    .eq("id", noteId)
    .single();

  if (!note) {
    return { error: "Note not found" };
  }

  // User can delete their own notes, or owners/directors can delete any note
  const isOwner = note.created_by === userId;
  const hasEditPermission = await checkVideoPermission(note.video_id, userId, "edit");

  if (!isOwner && !hasEditPermission) {
    return { error: "You can only delete your own notes" };
  }

  const { error } = await supabase
    .from("video_notes")
    .delete()
    .eq("id", noteId);

  if (error) {
    return { error: error.message };
  }

  const projectId = await getVideoProjectId(note.video_id);
  if (projectId) {
    revalidatePath(`/projects/${projectId}/videos/${note.video_id}`);
  }

  return { success: true };
}
