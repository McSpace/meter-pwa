# Railway Deployment Setup

## Environment Variables

In Railway, go to your project → **Variables** tab and add the following environment variables:

### Required Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# App Configuration
VITE_APP_NAME=Health Dashboard
VITE_APP_URL=https://your-app.up.railway.app

# AI Analysis API
VITE_AI_ANALYSIS_API_URL=https://webhook-processor-production-0a16.up.railway.app/webhook/analizeimage
```

## Important Notes

1. **`VITE_*` prefix is required** - Vite only exposes environment variables that start with `VITE_` to the client-side code.

2. **Variables are embedded at build time** - After adding or changing environment variables in Railway, you **must trigger a new deployment** (redeploy) for the changes to take effect.

3. **Audio Analysis URL** - The audio analysis endpoint is automatically derived from `VITE_AI_ANALYSIS_API_URL` by replacing `/analizeimage` with `/analizeaudio`. Make sure the base URL supports both endpoints.

## Troubleshooting

### "AI analysis API URL not configured" error

If you see this error:

1. Check that `VITE_AI_ANALYSIS_API_URL` is set in Railway Variables
2. Trigger a new deployment (the variable needs to be embedded during build)
3. Check browser console for debug logs showing the configured URLs

### Audio analysis not working

1. Verify the audio endpoint exists:
   - If image URL is `https://example.com/webhook/analizeimage`
   - Audio URL should be `https://example.com/webhook/analizeaudio`
2. Check browser console for actual URLs being used
3. Verify the API supports both endpoints

## Database Migrations

After deploying, run the migrations in Supabase SQL Editor:

```sql
-- Run in order:
-- 1. supabase/migrations/001_initial_schema.sql
-- 2. supabase/migrations/002_row_level_security.sql
-- 3. supabase/migrations/003_storage_setup.sql (or 003_storage_setup_fixed.sql)
-- 4. supabase/migrations/004_add_media_metrics_link.sql
-- 5. supabase/migrations/005_remove_metric_type_constraint.sql
```

## Verifying Deployment

1. Open the deployed app
2. Open browser DevTools → Console
3. Look for log message: `AI Analysis URLs: { imageUrl: ..., audioUrl: ... }`
4. Verify both URLs are correctly configured
