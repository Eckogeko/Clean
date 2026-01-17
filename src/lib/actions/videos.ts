"use server";

import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export type VideoSourceType = "upload" | "youtube" | "vimeo" | "external";

export type Video = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  source_type: VideoSourceType;
  storage_path: string | null;
  storage_url: string | null;
  external_url: string | null;
  external_id: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
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

export async function getVideos(projectId: string) {
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
    .from("videos")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, data: [] };
  }

  return { data: (data as Video[]) ?? [] };
}

export async function getVideo(videoId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("id", videoId)
    .single();

  if (error) {
    return { error: error.message };
  }

  const video = data as Video;

  const hasPermission = await checkProjectPermission(
    video.project_id,
    userId,
    "view"
  );
  if (!hasPermission) {
    return { error: "Access denied" };
  }

  return { data: video };
}

export async function createVideoFromUpload(
  projectId: string,
  title: string,
  storagePath: string,
  metadata: {
    description?: string;
    duration_seconds?: number;
    file_size_bytes?: number;
    mime_type?: string;
  }
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const hasPermission = await checkProjectPermission(projectId, userId, "edit");
  if (!hasPermission) {
    return { error: "Only owners and directors can upload videos" };
  }

  const supabase = await createClient();

  // Get the public URL for the uploaded file
  const {
    data: { publicUrl },
  } = supabase.storage.from("videos").getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from("videos")
    .insert({
      project_id: projectId,
      title,
      description: metadata.description || null,
      source_type: "upload",
      storage_path: storagePath,
      storage_url: publicUrl,
      duration_seconds: metadata.duration_seconds || null,
      file_size_bytes: metadata.file_size_bytes || null,
      mime_type: metadata.mime_type || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { data: data as Video };
}

export async function createVideoFromUrl(
  projectId: string,
  title: string,
  url: string,
  description?: string
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const hasPermission = await checkProjectPermission(projectId, userId, "edit");
  if (!hasPermission) {
    return { error: "Only owners and directors can add videos" };
  }

  // Parse the URL to determine source type
  const { type, id, thumbnailUrl } = parseExternalVideoUrl(url);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("videos")
    .insert({
      project_id: projectId,
      title,
      description: description || null,
      source_type: type,
      external_url: url,
      external_id: id,
      thumbnail_url: thumbnailUrl,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { data: data as Video };
}

export async function updateVideo(
  videoId: string,
  updates: { title?: string; description?: string }
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get the video to check permissions
  const { data: video } = await supabase
    .from("videos")
    .select("project_id")
    .eq("id", videoId)
    .single();

  if (!video) {
    return { error: "Video not found" };
  }

  const hasPermission = await checkProjectPermission(
    video.project_id,
    userId,
    "edit"
  );
  if (!hasPermission) {
    return { error: "Only owners and directors can edit videos" };
  }

  const { data, error } = await supabase
    .from("videos")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", videoId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${video.project_id}`);
  return { data: data as Video };
}

export async function deleteVideo(videoId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get the video to check permissions and get storage path
  const { data: video } = await supabase
    .from("videos")
    .select("project_id, storage_path, source_type")
    .eq("id", videoId)
    .single();

  if (!video) {
    return { error: "Video not found" };
  }

  const hasPermission = await checkProjectPermission(
    video.project_id,
    userId,
    "edit"
  );
  if (!hasPermission) {
    return { error: "Only owners and directors can delete videos" };
  }

  // If it's an uploaded video, delete from storage
  if (video.source_type === "upload" && video.storage_path) {
    await supabase.storage.from("videos").remove([video.storage_path]);
  }

  // Delete from database (video_notes will cascade)
  const { error } = await supabase.from("videos").delete().eq("id", videoId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${video.project_id}`);
  return { success: true };
}

export async function getSignedUploadUrl(
  projectId: string,
  fileName: string,
  contentType: string
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const hasPermission = await checkProjectPermission(projectId, userId, "edit");
  if (!hasPermission) {
    return { error: "Permission denied" };
  }

  const supabase = await createClient();

  // Generate unique path
  const fileExt = fileName.split(".").pop();
  const uniqueId = crypto.randomUUID();
  const path = `${projectId}/${uniqueId}.${fileExt}`;

  // Create signed upload URL (valid for 1 hour)
  const { data, error } = await supabase.storage
    .from("videos")
    .createSignedUploadUrl(path);

  if (error) {
    return { error: error.message };
  }

  return { data: { path, signedUrl: data.signedUrl, token: data.token } };
}

export async function getVideoPlaybackUrl(videoId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data: video } = await supabase
    .from("videos")
    .select("project_id, storage_path, storage_url, source_type, external_url")
    .eq("id", videoId)
    .single();

  if (!video) {
    return { error: "Video not found" };
  }

  const hasPermission = await checkProjectPermission(
    video.project_id,
    userId,
    "view"
  );
  if (!hasPermission) {
    return { error: "Access denied" };
  }

  // For external videos, return the external URL
  if (video.source_type !== "upload") {
    return { data: video.external_url };
  }

  // For uploaded videos, create a signed URL for playback
  if (video.storage_path) {
    const { data, error } = await supabase.storage
      .from("videos")
      .createSignedUrl(video.storage_path, 3600); // 1 hour expiry

    if (error) {
      return { error: error.message };
    }

    return { data: data.signedUrl };
  }

  return { error: "Video file not found" };
}

// Helper function to parse external video URLs
function parseExternalVideoUrl(url: string): {
  type: VideoSourceType;
  id: string | null;
  thumbnailUrl: string | null;
} {
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        type: "youtube",
        id: videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
    }
  }

  // Vimeo patterns
  const vimeoPatterns = [/vimeo\.com\/(\d+)/, /player\.vimeo\.com\/video\/(\d+)/];

  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        type: "vimeo",
        id: match[1],
        thumbnailUrl: null, // Vimeo thumbnails require API call
      };
    }
  }

  // Generic external URL
  return {
    type: "external",
    id: null,
    thumbnailUrl: null,
  };
}
