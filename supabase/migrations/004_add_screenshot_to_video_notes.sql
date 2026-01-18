-- Migration: Add screenshot support to video notes
-- Description: Add screenshot_url column to video_notes table for storing screenshot references

-- Add screenshot_url column to video_notes table
ALTER TABLE public.video_notes
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Add index for notes with screenshots (useful for filtering)
CREATE INDEX IF NOT EXISTS idx_video_notes_with_screenshot ON public.video_notes(video_id)
  WHERE screenshot_url IS NOT NULL;
