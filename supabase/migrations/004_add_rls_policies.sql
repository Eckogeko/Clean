-- Migration: Add RLS policies for videos, video_notes, and project_notes tables
-- Description: Enable Row Level Security and create policies for authenticated access

-- Enable RLS on videos table
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Enable RLS on video_notes table
ALTER TABLE public.video_notes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on project_notes table
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- Videos policies
-- Users can view videos if they are a member of the project's team
CREATE POLICY "Team members can view videos"
  ON public.videos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = videos.project_id
      AND tm.user_id = auth.jwt()->>'sub'
    )
  );

-- Users can insert videos if they are owner/director of the project's team
CREATE POLICY "Owners and directors can insert videos"
  ON public.videos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_id
      AND tm.user_id = auth.jwt()->>'sub'
      AND tm.role IN ('owner', 'director')
    )
  );

-- Users can update videos if they are owner/director of the project's team
CREATE POLICY "Owners and directors can update videos"
  ON public.videos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = videos.project_id
      AND tm.user_id = auth.jwt()->>'sub'
      AND tm.role IN ('owner', 'director')
    )
  );

-- Users can delete videos if they are owner/director of the project's team
CREATE POLICY "Owners and directors can delete videos"
  ON public.videos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = videos.project_id
      AND tm.user_id = auth.jwt()->>'sub'
      AND tm.role IN ('owner', 'director')
    )
  );

-- Video notes policies
-- Users can view video notes if they are a member of the video's project's team
CREATE POLICY "Team members can view video notes"
  ON public.video_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON p.id = v.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE v.id = video_notes.video_id
      AND tm.user_id = auth.jwt()->>'sub'
    )
  );

-- All team members can insert comments, only owners/directors can insert timestamp notes
CREATE POLICY "Team members can insert video notes"
  ON public.video_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON p.id = v.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE v.id = video_id
      AND tm.user_id = auth.jwt()->>'sub'
      AND (
        note_type = 'comment'
        OR tm.role IN ('owner', 'director')
      )
    )
  );

-- Users can update their own notes, or owners/directors can update any note
CREATE POLICY "Users can update own notes or owners/directors can update any"
  ON public.video_notes
  FOR UPDATE
  USING (
    created_by = auth.jwt()->>'sub'
    OR EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON p.id = v.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE v.id = video_notes.video_id
      AND tm.user_id = auth.jwt()->>'sub'
      AND tm.role IN ('owner', 'director')
    )
  );

-- Users can delete their own notes, or owners/directors can delete any note
CREATE POLICY "Users can delete own notes or owners/directors can delete any"
  ON public.video_notes
  FOR DELETE
  USING (
    created_by = auth.jwt()->>'sub'
    OR EXISTS (
      SELECT 1 FROM public.videos v
      JOIN public.projects p ON p.id = v.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE v.id = video_notes.video_id
      AND tm.user_id = auth.jwt()->>'sub'
      AND tm.role IN ('owner', 'director')
    )
  );

-- Project notes policies
-- Users can view project notes if they are a member of the project's team
CREATE POLICY "Team members can view project notes"
  ON public.project_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_notes.project_id
      AND tm.user_id = auth.jwt()->>'sub'
    )
  );

-- Only owners/directors can insert project notes
CREATE POLICY "Owners and directors can insert project notes"
  ON public.project_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_id
      AND tm.user_id = auth.jwt()->>'sub'
      AND tm.role IN ('owner', 'director')
    )
  );

-- Only owners/directors can update project notes
CREATE POLICY "Owners and directors can update project notes"
  ON public.project_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_notes.project_id
      AND tm.user_id = auth.jwt()->>'sub'
      AND tm.role IN ('owner', 'director')
    )
  );

-- Only owners/directors can delete project notes
CREATE POLICY "Owners and directors can delete project notes"
  ON public.project_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_notes.project_id
      AND tm.user_id = auth.jwt()->>'sub'
      AND tm.role IN ('owner', 'director')
    )
  );
