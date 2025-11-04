# Supabase Setup Guide

Complete instructions for setting up Supabase backend for Health Dashboard PWA.

## 📋 Requirements

- Supabase account (https://supabase.com)
- Created project in Supabase


---

## 🚀 Step 1: Applying SQL Migrations

### Via Supabase Dashboard (SQL Editor)

1. Open your project in Supabase Dashboard
2. Navigate to **SQL Editor** (left menu)
3. Click **New Query**
4. Apply migrations in the following order:

#### 1.1 Main database schema

Copy the contents of `migrations/001_initial_schema.sql` and execute:

```sql
-- Paste entire content of 001_initial_schema.sql
```

#### 1.2 Row Level Security policies

Copy the contents of `migrations/002_row_level_security.sql` and execute:

```sql
-- Paste entire content of 002_row_level_security.sql
```

#### 1.3 Storage buckets and policies

Copy the contents of `migrations/003_storage_setup.sql` and execute:

```sql
-- Paste entire content of 003_storage_setup.sql
```

### Via Supabase CLI (alternative)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to your account
supabase login

# Link local project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

---

## 🔐 Step 2: Authentication Setup

### 2.1 Email Provider (already enabled by default)

1. Navigate to **Authentication** → **Providers**
2. Email provider should already be enabled
3. Configure (optional):
   - **Enable email confirmations**: ✅ (recommended for production)
   - **Enable email change confirmations**: ✅
   - Configure email templates as desired

### 2.2 Google OAuth Provider

1. Navigate to **Authentication** → **Providers**
2. Find **Google** and click **Enable**
3. You will need to create OAuth credentials in Google Cloud Console:

#### Creating Google OAuth Credentials:

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. If required, configure OAuth consent screen:
   - **User Type**: External
   - **App name**: Health Dashboard
   - **User support email**: your email
   - **Authorized domains**: add your domain
   - **Scopes**: `email`, `profile`, `openid`

6. Create OAuth Client ID:
   - **Application type**: Web application
   - **Name**: Health Dashboard Web
   - **Authorized JavaScript origins**:
     - `https://YOUR_PROJECT_REF.supabase.co`
     - `http://localhost:5173` (for development)
   - **Authorized redirect URIs**:
     - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     - `http://localhost:54321/auth/v1/callback` (for local development)

7. Copy **Client ID** and **Client Secret**

8. Return to Supabase Dashboard → **Authentication** → **Providers** → **Google**:
   - Paste **Client ID**
   - Paste **Client Secret**
   - Click **Save**

### 2.3 Redirect URLs Setup

In **Authentication** → **URL Configuration** add:

**Site URL**:
```
https://meter-pwa-production.up.railway.app
```

**Redirect URLs**:
```
https://meter-pwa-production.up.railway.app/auth/callback
http://localhost:5173/auth/callback
```

---

## 🗂️ Step 3: Verify Storage Buckets

1. Navigate to **Storage** (left menu)
2. Ensure that two buckets are created:
   - `photos` - for photos (10MB limit)
   - `audio` - for voice notes (5MB limit)

3. Check settings for each bucket:
   - **Public**: ❌ (should be disabled)
   - **File size limit**: 10MB for photos, 5MB for audio
   - **Allowed MIME types**: configured according to migration

4. Check RLS policies in **Policies** for each bucket

---

## 🔑 Step 4: Obtaining API Credentials

1. Navigate to **Settings** → **API**
2. Copy the following data:

```
Project URL: https://YOUR_PROJECT_REF.supabase.co
Project API keys:
  - anon/public key: eyJhbG...
  - service_role key: eyJhbG... (keep secret!)
```

3. Create a `.env.local` file in the project root (see next step)

---

## 📝 Step 5: Frontend Configuration (.env.local)

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
VITE_APP_NAME=Health Dashboard
VITE_APP_URL=https://meter-pwa-production.up.railway.app
```

**⚠️ IMPORTANT**: Add `.env.local` to `.gitignore`:

```bash
echo ".env.local" >> .gitignore
```

---

## ✅ Step 6: Verify Installation

### 6.1 Database Verification

Run in SQL Editor:

```sql
-- Check tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Should have: users, profiles, metrics, media

-- Check RLS
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- Should have policies for all tables
```

### 6.2 Storage Verification

```sql
-- Check buckets
SELECT * FROM storage.buckets;

-- Should have: photos, audio
```

### 6.3 Auth Verification

1. Navigate to **Authentication** → **Users**
2. Try creating a test user through Dashboard
3. After creation, verify:

```sql
-- Check automatic creation of public.users record
SELECT * FROM public.users;

-- Should have a record with the created user's id
```

---

## 🧪 Step 7: API Testing

### 7.1 Email Registration Test

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/auth/v1/signup' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secure-password-123"
  }'
```

### 7.2 Profile Creation Test

```bash
# First, get the access_token from the previous request

curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/rest/v1/profiles' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "John Doe",
    "gender": "M",
    "date_of_birth": "1985-05-15"
  }'
```

### 7.3 File Upload Test

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/photos/USER_ID/test.jpg' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F file=@/path/to/test.jpg
```

---

## 🐛 Troubleshooting

### Error: "relation does not exist"
- Ensure all migrations are executed in the correct order
- Check logs in **Database** → **Logs**

### Error: "new row violates row-level security policy"
- Verify that RLS policies are created correctly
- Make sure you're using the correct JWT token
- Check `auth.uid()` in SQL Editor: `SELECT auth.uid();`

### File upload error: "new row violates row-level security policy for table objects"
- Ensure the file path starts with `{user_id}/`
- Check Storage RLS policies in migration 003

### Google OAuth not working
- Verify Client ID and Client Secret are correct
- Ensure Authorized redirect URIs match Supabase URL
- Check OAuth consent screen status (should be Published for production)

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)

---

## 🔄 Next Steps

After successful Supabase setup:

1. Install Supabase client in frontend:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Create Supabase client in `src/lib/supabase.ts`

3. Implement integration with components:
   - Authentication flow
   - Profile management
   - Metrics tracking
   - Media upload

4. Update components to work with real data from Supabase

---

## 📧 Support

If you encounter issues:
1. Check logs in Supabase Dashboard → **Logs**
2. Use SQL Editor for debugging queries
3. Check Network tab in browser for API requests
