-- Migration: Extend videos table and create notes tables
-- Description: Add external video support to videos table, create video_notes and project_notes tables

-- Alter videos table to support external videos (YouTube/Vimeo)
-- Existing columns: id, project_id, title, file_url, file_size, duration, thumbnail_url, uploaded_by, created_at

-- Add source_type column with default 'upload' for existing rows
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'upload' CHECK (source_type IN ('upload', 'youtube', 'vimeo', 'external'));

-- Add description column
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add storage_path for Supabase Storage
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add external video columns
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS external_url TEXT;

ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add updated_at for tracking changes
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Rename columns to match new schema (if they exist with old names)
-- file_url -> storage_url, file_size -> file_size_bytes, uploaded_by -> created_by
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'file_url') THEN
    ALTER TABLE public.videos RENAME COLUMN file_url TO storage_url;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'uploaded_by') THEN
    ALTER TABLE public.videos RENAME COLUMN uploaded_by TO created_by;
  END IF;
END $$;

-- Add file_size_bytes if file_size doesn't exist
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- Add mime_type column
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Update duration column to duration_seconds (integer) if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'duration' AND data_type = 'numeric') THEN
    ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
    UPDATE public.videos SET duration_seconds = ROUND(duration)::INTEGER WHERE duration IS NOT NULL;
  END IF;
END $$;

-- Make source_type NOT NULL after setting defaults
UPDATE public.videos SET source_type = 'upload' WHERE source_type IS NULL;
ALTER TABLE public.videos ALTER COLUMN source_type SET NOT NULL;

-- Make storage_url nullable (external videos won't have it)
ALTER TABLE public.videos ALTER COLUMN storage_url DROP NOT NULL;

-- Video notes table (comments and timestamped notes)
CREATE TABLE IF NOT EXISTS public.video_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,

  -- Note type
  note_type TEXT NOT NULL CHECK (note_type IN ('comment', 'timestamp')),

  -- Content
  content TEXT NOT NULL,

  -- For timestamped notes (null for regular comments)
  timestamp_seconds INTEGER,

  -- Audit fields
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project notes table (standalone notes)
CREATE TABLE IF NOT EXISTS public.project_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Content
  title TEXT,
  content TEXT NOT NULL,

  -- Pin important notes
  is_pinned BOOLEAN DEFAULT FALSE,

  -- Audit fields
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_project_id ON public.videos(project_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_notes_video_id ON public.video_notes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_notes_timestamp ON public.video_notes(video_id, timestamp_seconds)
  WHERE note_type = 'timestamp';

CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON public.project_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_pinned ON public.project_notes(project_id, is_pinned DESC, created_at DESC);
