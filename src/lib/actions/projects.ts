"use server";

import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export type Project = {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export async function createProject(
  teamId: string,
  name: string,
  description?: string
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      team_id: teamId,
      name,
      description: description || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { data: data as Project };
}

export async function getProjects(teamId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized", data: [] };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });

  if (error) {
    return { error: error.message, data: [] };
  }

  return { data: (data as Project[]) ?? [] };
}

export async function getProject(projectId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data: data as Project };
}

export async function updateProject(
  projectId: string,
  updates: { name?: string; description?: string }
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { data: data as Project };
}

export async function deleteProject(projectId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get the project to find its team
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return { error: "Project not found" };
  }

  // Check if user is an owner of the team
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .single();

  if (!membership || membership.role !== "owner") {
    return { error: "Only owners can delete projects" };
  }

  // Delete the project (videos, documents, blocks will cascade)
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
