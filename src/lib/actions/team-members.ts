"use server";

import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

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

export type UserInfo = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export type TeamMemberWithUser = TeamMember & {
  user?: UserInfo | null;
};

export async function getTeamMembers(teamId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized", data: [] };
  }

  const supabase = await createClient();

  // Get team members
  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId);

  if (membersError) {
    return { error: membersError.message, data: [] };
  }

  if (!members || members.length === 0) {
    return { data: [] };
  }

  // Get user info for each member
  const userIds = members.map((m) => m.user_id);
  const { data: users } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, avatar_url")
    .in("id", userIds);

  // Combine member data with user info
  const membersWithUsers: TeamMemberWithUser[] = members.map((member) => ({
    ...member,
    user: users?.find((u) => u.id === member.user_id) || null,
  }));

  return { data: membersWithUsers };
}

export async function inviteMemberByEmail(
  teamId: string,
  email: string,
  role: "director" | "dancer" = "dancer"
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Check if the inviter is an owner or director of this team
  const { data: inviterMembership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  const inviterRole = inviterMembership?.role;
  const canInvite = inviterRole === "owner" || inviterRole === "director";

  if (!canInvite) {
    return { error: "Only owners and directors can invite members" };
  }

  // Only owners can assign director role
  if (role === "director" && inviterRole !== "owner") {
    return { error: "Only owners can assign the director role" };
  }

  // Check if user with this email exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  // Check if already a member
  if (existingUser) {
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", existingUser.id)
      .single();

    if (existingMember) {
      return { error: "User is already a member of this team" };
    }
  }

  // Check if there's already a pending invite for this email
  const { data: existingInvite } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("email", email)
    .is("user_id", null)
    .single();

  if (existingInvite) {
    return { error: "An invite has already been sent to this email" };
  }

  // Set permissions based on role
  const permissions = {
    can_edit: role === "director",
    can_delete: role === "director",
    can_upload: true,
  };

  // If user exists, add them directly; otherwise create a pending invite
  const { data, error } = await supabase
    .from("team_members")
    .insert({
      team_id: teamId,
      user_id: existingUser?.id || userId, // Use inviter's ID as placeholder if user doesn't exist
      email: email,
      role,
      permissions,
      invited_by: userId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { data: data as TeamMember };
}

export async function inviteMemberByUserId(
  teamId: string,
  targetUserId: string,
  role: "director" | "dancer" = "dancer"
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Check if the inviter is an owner or director of this team
  const { data: inviterMembership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  const inviterRole = inviterMembership?.role;
  const canInvite = inviterRole === "owner" || inviterRole === "director";

  if (!canInvite) {
    return { error: "Only owners and directors can invite members" };
  }

  // Only owners can assign director role
  if (role === "director" && inviterRole !== "owner") {
    return { error: "Only owners can assign the director role" };
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", targetUserId)
    .single();

  if (existingMember) {
    return { error: "User is already a member of this team" };
  }

  // Get user's email
  const { data: targetUser } = await supabase
    .from("users")
    .select("email")
    .eq("id", targetUserId)
    .single();

  // Set permissions based on role
  const permissions = {
    can_edit: role === "director",
    can_delete: role === "director",
    can_upload: true,
  };

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      team_id: teamId,
      user_id: targetUserId,
      email: targetUser?.email || null,
      role,
      permissions,
      invited_by: userId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { data: data as TeamMember };
}

export async function updateMemberRole(
  teamId: string,
  memberId: string,
  role: "director" | "dancer"
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Check if the current user is an owner
  const { data: currentUserMembership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  if (!currentUserMembership || currentUserMembership.role !== "owner") {
    return { error: "Only owners can change member roles" };
  }

  // Get the member being updated to check their current role
  const { data: targetMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", memberId)
    .single();

  // Cannot change the role of another owner
  if (targetMember?.role === "owner") {
    return { error: "Cannot change the role of an owner" };
  }

  // Set permissions based on new role
  const permissions = {
    can_edit: role === "director",
    can_delete: role === "director",
    can_upload: true,
  };

  const { data, error } = await supabase
    .from("team_members")
    .update({ role, permissions })
    .eq("id", memberId)
    .eq("team_id", teamId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { data: data as TeamMember };
}

export async function removeMember(teamId: string, memberId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Check if the current user is an owner or director
  const { data: currentUserMembership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  const currentUserRole = currentUserMembership?.role;
  const canRemove = currentUserRole === "owner" || currentUserRole === "director";

  if (!canRemove) {
    return { error: "Only owners and directors can remove members" };
  }

  // Get the member being removed
  const { data: memberToRemove } = await supabase
    .from("team_members")
    .select("user_id, role")
    .eq("id", memberId)
    .single();

  // Cannot remove an owner
  if (memberToRemove?.role === "owner") {
    return { error: "Cannot remove an owner from the team" };
  }

  // Directors can only remove dancers, not other directors
  if (currentUserRole === "director" && memberToRemove?.role === "director") {
    return { error: "Only owners can remove directors" };
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId)
    .eq("team_id", teamId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function searchUsers(query: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized", data: [] };
  }

  if (!query || query.length < 2) {
    return { data: [] };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, avatar_url")
    .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .limit(10);

  if (error) {
    return { error: error.message, data: [] };
  }

  return { data: (data as UserInfo[]) ?? [] };
}

export async function getCurrentUserRole(teamId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized", role: null };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return { error: error.message, role: null };
  }

  return { role: data?.role as "owner" | "director" | "dancer" | null };
}
