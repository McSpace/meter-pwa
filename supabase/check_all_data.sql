-- Check all data (admin view, no RLS)
-- This shows what's actually in the database

-- 1. All auth users
SELECT
  '1. Auth Users' as section,
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. All public users
SELECT
  '2. Public Users' as section,
  id,
  name,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- 3. All profiles
SELECT
  '3. Profiles' as section,
  id,
  user_id,
  name,
  gender,
  date_of_birth,
  deleted_at,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if users match
SELECT
  '4. Orphaned Auth Users' as section,
  au.id,
  au.email,
  CASE
    WHEN pu.id IS NULL THEN '❌ Missing in public.users'
    ELSE '✅ Exists in public.users'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 5;
