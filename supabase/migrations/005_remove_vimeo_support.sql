-- Migration: Remove Vimeo support from videos table
-- Description: Update source_type constraint to remove 'vimeo' as a valid option

-- First, update any existing vimeo videos to 'external' type
UPDATE public.videos SET source_type = 'external' WHERE source_type = 'vimeo';

-- Drop the existing constraint
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_source_type_check;

-- Add new constraint without vimeo
ALTER TABLE public.videos ADD CONSTRAINT videos_source_type_check
  CHECK (source_type IN ('upload', 'youtube', 'external'));
