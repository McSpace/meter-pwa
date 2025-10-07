# Railway Deployment Instructions

## Environment Variables

Set these in Railway project settings (Variables tab):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get values from: Supabase Dashboard → Settings → API

## How It Works

Railway uses **build-time environment variables**:

1. **Build**: `npm ci && npm run build`
   - Vite replaces `import.meta.env.VITE_*` with actual values during build
   - Outputs optimized static files to `dist/`

2. **Deploy**: `npx serve -s dist -p $PORT`
   - Serves pre-built static files
   - No runtime configuration needed

## Local Development

```bash
# Create .env.local with your values
cp .env.example .env.local

# Start dev server (uses .env.local)
npm run dev
```

## Production Testing

```bash
# Build with production env vars
npm run build

# Serve locally
npm start
```

## Notes

- Env vars are embedded at build time
- Changing env vars requires redeployment
- Railway automatically rebuilds on git push
