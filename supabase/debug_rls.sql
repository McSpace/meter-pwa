-- ============================================================================
-- DEBUG RLS - Check current user and permissions
-- Run this in Supabase Dashboard → SQL Editor (as authenticated user)
-- ============================================================================

-- 1. Check current authenticated user
SELECT
  'Current User' as check_name,
  auth.uid() as user_id,
  auth.email() as email;

-- 2. Check if user exists in public.users
SELECT
  'User Record' as check_name,
  id,
  name,
  created_at
FROM public.users
WHERE id = auth.uid();

-- 3. Check user's profiles
SELECT
  'User Profiles' as check_name,
  id as profile_id,
  name,
  user_id,
  deleted_at,
  CASE
    WHEN user_id = auth.uid() THEN '✅ Owned by current user'
    ELSE '❌ NOT owned by current user'
  END as ownership,
  CASE
    WHEN deleted_at IS NULL THEN '✅ Active'
    ELSE '❌ Deleted'
  END as status
FROM public.profiles
WHERE user_id = auth.uid();

-- 4. Test INSERT permission simulation (won't actually insert)
WITH test_profile AS (
  SELECT id FROM public.profiles
  WHERE user_id = auth.uid()
  AND deleted_at IS NULL
  LIMIT 1
)
SELECT
  'INSERT Test' as check_name,
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = test_profile.id
      AND profiles.user_id = auth.uid()
      AND profiles.deleted_at IS NULL
  ) as can_insert,
  test_profile.id as profile_id
FROM test_profile;

-- 5. Check RLS policies on media table
SELECT
  'Media Policies' as check_name,
  policyname,
  cmd as operation,
  CASE
    WHEN cmd = 'INSERT' THEN '📝 This is what we need'
    ELSE ''
  END as note
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'media'
ORDER BY cmd, policyname;
