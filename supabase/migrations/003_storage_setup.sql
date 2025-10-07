-- Health Dashboard - Storage Buckets Setup
-- Created: 2024-10-06
-- Description: Create storage buckets for photos and audio files with RLS policies

-- ============================================================================
-- CREATE STORAGE BUCKETS
-- ============================================================================

-- Photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false, -- private bucket, access via signed URLs
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Audio bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  false, -- private bucket, access via signed URLs
  5242880, -- 5MB limit
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/wav', 'audio/m4a']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE RLS POLICIES - PHOTOS BUCKET
-- ============================================================================

-- Users can view their own photos
CREATE POLICY "Users can view own photos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can upload photos to their folder
CREATE POLICY "Users can upload own photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own photos (metadata)
CREATE POLICY "Users can update own photos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- STORAGE RLS POLICIES - AUDIO BUCKET
-- ============================================================================

-- Users can view their own audio files
CREATE POLICY "Users can view own audio"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can upload audio to their folder
CREATE POLICY "Users can upload own audio"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own audio (metadata)
CREATE POLICY "Users can update own audio"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own audio
CREATE POLICY "Users can delete own audio"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- HELPER FUNCTION TO GET FILE URL
-- ============================================================================

-- Function to generate public URL for storage files (with signed URL)
CREATE OR REPLACE FUNCTION get_file_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT AS $$
DECLARE
  project_url TEXT;
BEGIN
  -- Get project URL from settings
  SELECT current_setting('app.settings.project_url', true) INTO project_url;

  IF project_url IS NULL THEN
    project_url := 'http://localhost:54321'; -- Fallback for local development
  END IF;

  RETURN project_url || '/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view own photos" ON storage.objects IS 'Users can only view photos in their user folder';
COMMENT ON POLICY "Users can upload own photos" ON storage.objects IS 'Users can only upload to their user folder in photos bucket';
COMMENT ON POLICY "Users can view own audio" ON storage.objects IS 'Users can only view audio in their user folder';
COMMENT ON POLICY "Users can upload own audio" ON storage.objects IS 'Users can only upload to their user folder in audio bucket';

-- ============================================================================
-- STORAGE PATH STRUCTURE
-- ============================================================================

-- Files will be stored with the following structure:
-- photos/{user_id}/{profile_id}/{uuid}.jpg
-- photos/{user_id}/{profile_id}/{uuid}_thumb.jpg
-- audio/{user_id}/{profile_id}/{uuid}.mp3

-- This structure allows:
-- 1. RLS to easily check ownership via user_id in path
-- 2. Organization by profile
-- 3. Unique filenames via UUID
-- 4. Easy cleanup when deleting users/profiles
