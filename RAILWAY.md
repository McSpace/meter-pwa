# Railway Deployment Guide

This document provides instructions for deploying the Health Dashboard PWA to Railway.

## Prerequisites

- Railway account with a project created
- Access to the Supabase project credentials

## Environment Variables Configuration

The application requires the following environment variables to be configured in Railway. These are build-time variables that get embedded into the static bundle during the Docker build process.

### Required Variables

These variables **must** be configured or the application will fail to start with the error: `Missing Supabase environment variables`

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://ovsvuwszgdwkgvdmboxo.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional Variables

These variables are recommended but not required for basic functionality:

| Variable | Description | Default/Example Value |
|----------|-------------|----------------------|
| `VITE_APP_NAME` | Application name shown in PWA manifest | `Health Dashboard` |
| `VITE_APP_URL` | Deployed application URL (for OAuth redirects) | `https://meter-pwa-production.up.railway.app` |
| `VITE_AI_ANALYSIS_API_URL` | External AI analysis service endpoint | `https://webhook-processor-production-0a16.up.railway.app/webhook/analizeimage` |

## How to Configure Variables in Railway

1. **Navigate to your Railway project**
   - Go to [railway.app](https://railway.app)
   - Select your `meter-pwa` project

2. **Access the Variables tab**
   - Click on your service
   - Navigate to the "Variables" tab

3. **Add each environment variable**
   - Click "+ New Variable"
   - Enter the variable name (e.g., `VITE_SUPABASE_URL`)
   - Enter the corresponding value
   - Click "Add"

4. **Save and redeploy**
   - Railway will automatically trigger a new deployment when variables are added
   - Alternatively, manually trigger a redeploy from the "Deployments" tab

## Finding Your Supabase Credentials

If you don't have your Supabase credentials:

1. Go to [supabase.com](https://supabase.com)
2. Navigate to your project
3. Click on the Settings icon (⚙️) in the sidebar
4. Go to "API" section
5. Copy:
   - **Project URL** → Use as `VITE_SUPABASE_URL`
   - **anon/public key** → Use as `VITE_SUPABASE_ANON_KEY`

**Note:** The anon key is safe to expose in frontend code because Supabase uses Row-Level Security (RLS) policies to protect your data.

## Deployment Process

The deployment uses a multi-stage Dockerfile:

1. **Builder Stage** (`Dockerfile` lines 6-34)
   - Installs dependencies
   - Receives environment variables as build arguments
   - Runs `npm run build` to create static assets
   - Environment variables are embedded into the bundle at this stage

2. **Runtime Stage** (`Dockerfile` lines 39-55)
   - Copies built static files
   - Runs a lightweight Node.js static server (`serve.js`)
   - Serves files on port 8080 (or `PORT` env variable)

## Verifying the Deployment

After deployment completes:

1. **Check build logs**
   - Go to the "Deployments" tab in Railway
   - Click on the latest deployment
   - Review logs to ensure no errors during build

2. **Test the application**
   - Visit your deployment URL
   - Open browser DevTools console
   - Verify no errors about missing environment variables
   - Test authentication and core features

## Troubleshooting

### Error: "Missing Supabase environment variables"

**Cause:** Environment variables not configured in Railway

**Solution:**
1. Verify all required variables are added in Railway Variables tab
2. Ensure variable names exactly match (case-sensitive): `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Trigger a new deployment after adding variables

### Application builds but shows blank page

**Cause:** Environment variables might be set incorrectly

**Solution:**
1. Check Railway build logs for any warnings
2. Verify Supabase URL format: `https://[project-ref].supabase.co`
3. Verify the anon key is the complete JWT token
4. Test locally with the same values in `.env.local`

### Changes to environment variables not reflected

**Cause:** Build cache or no redeploy triggered

**Solution:**
1. Trigger a manual redeploy from Railway dashboard
2. Or push a new commit to force a rebuild

## Local Development

For local development, environment variables are configured in `.env.local` (not committed to git):

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your actual credentials
```

See [.env.example](.env.example) for the template.

## Security Notes

- The Supabase anon key is designed to be public and safe to expose in frontend code
- Database security is enforced through Supabase Row-Level Security (RLS) policies
- Never commit `.env.local` to version control (it's in `.gitignore`)
- The `.env.example` file should only contain placeholder values, not real credentials

## Related Files

- [Dockerfile](Dockerfile) - Multi-stage Docker build configuration
- [railway.json](railway.json) - Railway deployment settings
- [serve.js](serve.js) - Production static file server
- [.env.example](.env.example) - Environment variables template
- [src/lib/supabase.ts](src/lib/supabase.ts) - Supabase client initialization
