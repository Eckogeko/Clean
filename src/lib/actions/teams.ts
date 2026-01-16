"use server";

import { createClient } from "@/lib/supabase/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export type Team = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  email: string | null;
  role: "owner" | "director" | "dancer";
  permissions: {
    can_edit: boolean;
    can_delete: boolean;
    can_upload: boolean;
  };
  invited_by: string;
  joined_at: string;
};

export async function createTeam(name: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  // Try to get email, but don't require it
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? null;

  const supabase = await createClient();

  // Create the team
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ name, created_by: userId })
    .select()
    .single();

  if (teamError) {
    return { error: teamError.message };
  }

  // Add the creator as an owner with full permissions
  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: userId,
    email: email,
    role: "owner",
    permissions: {
      can_edit: true,
      can_delete: true,
      can_upload: true,
    },
    invited_by: userId,
  });

  if (memberError) {
    // Rollback: delete the team if member creation fails
    await supabase.from("teams").delete().eq("id", team.id);
    return { error: memberError.message };
  }

  revalidatePath("/");
  return { data: team as Team };
}

export async function getTeams() {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized", data: [] };
  }

  const supabase = await createClient();

  // Get team IDs the user is a member of
  const { data: memberships, error: memberError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId);

  if (memberError) {
    return { error: memberError.message, data: [] };
  }

  if (!memberships || memberships.length === 0) {
    return { data: [] };
  }

  const teamIds = memberships.map((m) => m.team_id);

  // Fetch the actual teams
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .in("id", teamIds);

  if (teamsError) {
    return { error: teamsError.message, data: [] };
  }

  return { data: (teams as Team[]) ?? [] };
}

export async function getTeam(teamId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data: data as Team };
}

export async function updateTeam(teamId: string, name: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", teamId)
    .eq("created_by", userId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { data: data as Team };
}

export async function deleteTeam(teamId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Check if user is an owner of this team
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  if (!membership || membership.role !== "owner") {
    return { error: "Only owners can delete a team" };
  }

  // Delete team members first (due to foreign key constraints)
  const { error: membersError } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId);

  if (membersError) {
    return { error: membersError.message };
  }

  // Delete projects (this will cascade to videos, documents, blocks)
  const { error: projectsError } = await supabase
    .from("projects")
    .delete()
    .eq("team_id", teamId);

  if (projectsError) {
    return { error: projectsError.message };
  }

  // Delete the team
  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
