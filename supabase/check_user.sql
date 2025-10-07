-- Quick check: does your user exist in public.users?
-- Run this in SQL Editor

-- 1. Your auth user
SELECT 'Auth User' as type, id, email, created_at
FROM auth.users
WHERE id = auth.uid();

-- 2. Your public user record (should exist!)
SELECT 'Public User' as type, id, name, created_at
FROM public.users
WHERE id = auth.uid();

-- 3. Your profiles
SELECT 'Profile' as type, id, name, user_id, deleted_at
FROM public.profiles
WHERE user_id = auth.uid();

-- If "Public User" returns nothing, run this to create it:
-- INSERT INTO public.users (id, created_at, updated_at)
-- VALUES (auth.uid(), NOW(), NOW());
