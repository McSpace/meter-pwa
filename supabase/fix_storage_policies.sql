-- ============================================================================
-- FIX STORAGE POLICIES
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Check if buckets exist
SELECT
  'Storage Buckets' as check,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('photos', 'audio');

-- If buckets don't exist, create them:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('photos', 'photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('audio', 'audio', false, 5242880, ARRAY['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/wav', 'audio/m4a'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/wav', 'audio/m4a'];

-- ============================================================================
-- STORAGE RLS POLICIES FOR PHOTOS BUCKET
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

-- SELECT (view files)
CREATE POLICY "Users can view own photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- INSERT (upload files)
CREATE POLICY "Users can upload own photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE (update metadata)
CREATE POLICY "Users can update own photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE (delete files)
CREATE POLICY "Users can delete own photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STORAGE RLS POLICIES FOR AUDIO BUCKET
-- ============================================================================

-- SELECT (view files)
CREATE POLICY "Users can view own audio"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- INSERT (upload files)
CREATE POLICY "Users can upload own audio"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE (update metadata)
CREATE POLICY "Users can update own audio"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE (delete files)
CREATE POLICY "Users can delete own audio"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- VERIFY POLICIES (alternative method)
-- ============================================================================

-- Check policies from pg_policies view
SELECT
  'Storage Policies' as check,
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%own%'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Storage buckets and policies created successfully!';
  RAISE NOTICE 'Buckets: photos, audio';
  RAISE NOTICE 'Policies: SELECT, INSERT, UPDATE, DELETE for each bucket';
END $$;
