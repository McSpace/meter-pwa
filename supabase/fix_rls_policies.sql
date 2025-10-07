-- ============================================================================
-- FIX RLS POLICIES - Idempotent Script
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- First, enable RLS on all tables (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profiles" ON public.profiles;
CREATE POLICY "Users can view own profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can create own profiles" ON public.profiles;
CREATE POLICY "Users can create own profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profiles" ON public.profiles;
CREATE POLICY "Users can update own profiles"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profiles" ON public.profiles;
CREATE POLICY "Users can delete own profiles"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- METRICS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view metrics for own profiles" ON public.metrics;
CREATE POLICY "Users can view metrics for own profiles"
  ON public.metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = metrics.profile_id
        AND profiles.user_id = auth.uid()
        AND profiles.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Users can create metrics for own profiles" ON public.metrics;
CREATE POLICY "Users can create metrics for own profiles"
  ON public.metrics
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = metrics.profile_id
        AND profiles.user_id = auth.uid()
        AND profiles.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can update metrics for own profiles" ON public.metrics;
CREATE POLICY "Users can update metrics for own profiles"
  ON public.metrics
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = metrics.profile_id
        AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = metrics.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete metrics for own profiles" ON public.metrics;
CREATE POLICY "Users can delete metrics for own profiles"
  ON public.metrics
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = metrics.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

-- ============================================================================
-- MEDIA TABLE POLICIES (IMPORTANT FOR PHOTO UPLOAD!)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view media for own profiles" ON public.media;
CREATE POLICY "Users can view media for own profiles"
  ON public.media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = media.profile_id
        AND profiles.user_id = auth.uid()
        AND profiles.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Users can upload media for own profiles" ON public.media;
CREATE POLICY "Users can upload media for own profiles"
  ON public.media
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = media.profile_id
        AND profiles.user_id = auth.uid()
        AND profiles.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can update media for own profiles" ON public.media;
CREATE POLICY "Users can update media for own profiles"
  ON public.media
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = media.profile_id
        AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = media.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete media for own profiles" ON public.media;
CREATE POLICY "Users can delete media for own profiles"
  ON public.media
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = media.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this separately to check all policies were created:
/*
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
*/

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ All RLS policies have been applied successfully!';
  RAISE NOTICE 'Tables secured: users, profiles, metrics, media';
  RAISE NOTICE 'Run the verification query above to confirm.';
END $$;
