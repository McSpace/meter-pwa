-- Health Dashboard - Storage Buckets Setup (Fixed)
-- Created: 2024-10-06
-- Description: Create storage buckets (policies will be created via Dashboard UI)

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
-- NOTE: Storage RLS policies should be created via Supabase Dashboard UI
-- ============================================================================
-- Go to: Storage → Buckets → [bucket name] → Policies → New Policy
--
-- For each bucket (photos and audio), create these 4 policies:
--
-- 1. SELECT (View files)
--    Name: Users can view own files
--    Policy: (bucket_id = 'photos' OR bucket_id = 'audio') AND (storage.foldername(name))[1] = auth.uid()::text
--
-- 2. INSERT (Upload files)
--    Name: Users can upload own files
--    Policy: (bucket_id = 'photos' OR bucket_id = 'audio') AND (storage.foldername(name))[1] = auth.uid()::text
--
-- 3. UPDATE (Update metadata)
--    Name: Users can update own files
--    Policy: (bucket_id = 'photos' OR bucket_id = 'audio') AND (storage.foldername(name))[1] = auth.uid()::text
--
-- 4. DELETE (Delete files)
--    Name: Users can delete own files
--    Policy: (bucket_id = 'photos' OR bucket_id = 'audio') AND (storage.foldername(name))[1] = auth.uid()::text
