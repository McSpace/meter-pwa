-- Health Dashboard - Row Level Security Policies
-- Created: 2024-10-06
-- Description: RLS policies to ensure users can only access their own data

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can read their own data
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own record (on signup)
CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Users can view their own profiles
CREATE POLICY "Users can view own profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Users can create profiles for themselves
CREATE POLICY "Users can create own profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profiles
CREATE POLICY "Users can update own profiles"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own profiles (soft delete)
CREATE POLICY "Users can delete own profiles"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- METRICS TABLE POLICIES
-- ============================================================================

-- Users can view metrics for their profiles
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

-- Users can create metrics for their profiles
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

-- Users can update metrics for their profiles
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

-- Users can delete metrics for their profiles
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
-- MEDIA TABLE POLICIES
-- ============================================================================

-- Users can view media for their profiles
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

-- Users can upload media for their profiles
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

-- Users can update media metadata for their profiles
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

-- Users can delete media for their profiles
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
-- FUNCTION TO AUTO-CREATE USER RECORD ON AUTH SIGNUP
-- ============================================================================

-- This function automatically creates a record in public.users when a new auth.users record is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NULL),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view own data" ON public.users IS 'Users can only read their own user record';
COMMENT ON POLICY "Users can view own profiles" ON public.profiles IS 'Users can view all their family member profiles';
COMMENT ON POLICY "Users can view metrics for own profiles" ON public.metrics IS 'Users can view metrics only for their own profiles';
COMMENT ON POLICY "Users can view media for own profiles" ON public.media IS 'Users can view media only for their own profiles';
