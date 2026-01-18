"use server";

import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

async function checkVideoPermission(
  videoId: string,
  userId: string
): Promise<boolean> {
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

  // Check user's role in the team - only owners/directors can take screenshots
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .single();

  if (!membership) return false;

  return membership.role === "owner" || membership.role === "director";
}

export async function getScreenshotUploadUrl(
  videoId: string,
  timestamp: number
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const hasPermission = await checkVideoPermission(videoId, userId);
  if (!hasPermission) {
    return { error: "Only owners and directors can take screenshots" };
  }

  const supabase = await createClient();

  // Generate unique path for the screenshot
  const uniqueId = crypto.randomUUID();
  const path = `${videoId}/${timestamp}-${uniqueId}.png`;

  // Create signed upload URL (valid for 1 hour)
  const { data, error } = await supabase.storage
    .from("screenshots")
    .createSignedUploadUrl(path);

  if (error) {
    return { error: error.message };
  }

  return { data: { path, signedUrl: data.signedUrl, token: data.token } };
}

export async function getScreenshotPublicUrl(path: string) {
  const supabase = await createClient();

  const {
    data: { publicUrl },
  } = supabase.storage.from("screenshots").getPublicUrl(path);

  return { data: publicUrl };
}
