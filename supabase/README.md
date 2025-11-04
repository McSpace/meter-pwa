# Supabase Backend for Health Dashboard

## 🎯 Quick Start

### 1. Apply Migrations

Open Supabase Dashboard → SQL Editor and execute in order:

1. `migrations/001_initial_schema.sql` - create tables
2. `migrations/002_row_level_security.sql` - configure security
3. `migrations/003_storage_setup.sql` - create storage buckets

### 2. Configure Auth

**Authentication → Providers**:
- ✅ Email (already enabled)
- ✅ Google OAuth ([instructions in SETUP.md](./SETUP.md#22-google-oauth-provider))

**URL Configuration**:
```
Site URL: https://meter-pwa-production.up.railway.app
Redirect URLs:
  - https://meter-pwa-production.up.railway.app/auth/callback
  - http://localhost:5173/auth/callback
```

### 3. Create .env.local

```bash
cp .env.example .env.local
```

Fill with values from **Settings → API**:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### 4. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

---

## 📁 File Structure

```
supabase/
├── README.md                  # This file
├── SETUP.md                   # Complete setup guide
└── migrations/
    ├── 001_initial_schema.sql       # Tables
    ├── 002_row_level_security.sql   # RLS policies
    └── 003_storage_setup.sql        # Storage buckets
```

---

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - detailed setup instructions
- **[BACKEND_SUPABASE.md](../BACKEND_SUPABASE.md)** - API reference and code examples
- **[BACKEND_SPEC.md](../BACKEND_SPEC.md)** - original specification (for reference)

---

## 🔍 Installation Verification

After applying migrations:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Should have: users, profiles, metrics, media

-- Check Storage buckets
SELECT * FROM storage.buckets;
-- Should have: photos, audio
```

---

## 🚀 Next Steps

1. ✅ Apply migrations
2. ✅ Configure Auth providers
3. ⬜ Create Supabase client in frontend
4. ⬜ Implement auth flow
5. ⬜ Update components to work with API

See [BACKEND_SUPABASE.md](../BACKEND_SUPABASE.md) for code examples.
