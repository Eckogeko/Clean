"use server";

import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export type ProjectNote = {
  id: string;
  project_id: string;
  title: string | null;
  content: string;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

async function checkProjectPermission(
  projectId: string,
  userId: string,
  permission: "view" | "edit"
) {
  const supabase = await createClient();

  // Get project's team
  const { data: project } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", projectId)
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

export async function getProjectNotes(projectId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized", data: [] };
  }

  const hasPermission = await checkProjectPermission(projectId, userId, "view");
  if (!hasPermission) {
    return { error: "Access denied", data: [] };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_notes")
    .select("*")
    .eq("project_id", projectId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, data: [] };
  }

  return { data: (data as ProjectNote[]) ?? [] };
}

export async function getProjectNote(noteId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_notes")
    .select("*")
    .eq("id", noteId)
    .single();

  if (error) {
    return { error: error.message };
  }

  const note = data as ProjectNote;

  const hasPermission = await checkProjectPermission(note.project_id, userId, "view");
  if (!hasPermission) {
    return { error: "Access denied" };
  }

  return { data: note };
}

export async function createProjectNote(
  projectId: string,
  content: string,
  title?: string
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const hasPermission = await checkProjectPermission(projectId, userId, "edit");
  if (!hasPermission) {
    return { error: "Only owners and directors can create project notes" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_notes")
    .insert({
      project_id: projectId,
      title: title || null,
      content,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { data: data as ProjectNote };
}

export async function updateProjectNote(
  noteId: string,
  updates: { content?: string; title?: string; is_pinned?: boolean }
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get the note to check permissions
  const { data: note } = await supabase
    .from("project_notes")
    .select("project_id")
    .eq("id", noteId)
    .single();

  if (!note) {
    return { error: "Note not found" };
  }

  const hasPermission = await checkProjectPermission(note.project_id, userId, "edit");
  if (!hasPermission) {
    return { error: "Only owners and directors can edit project notes" };
  }

  const { data, error } = await supabase
    .from("project_notes")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${note.project_id}`);
  return { data: data as ProjectNote };
}

export async function deleteProjectNote(noteId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get the note to check permissions
  const { data: note } = await supabase
    .from("project_notes")
    .select("project_id")
    .eq("id", noteId)
    .single();

  if (!note) {
    return { error: "Note not found" };
  }

  const hasPermission = await checkProjectPermission(note.project_id, userId, "edit");
  if (!hasPermission) {
    return { error: "Only owners and directors can delete project notes" };
  }

  const { error } = await supabase
    .from("project_notes")
    .delete()
    .eq("id", noteId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${note.project_id}`);
  return { success: true };
}
