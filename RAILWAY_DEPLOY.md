# Railway Deployment Instructions

## Required Environment Variables

Set these in your Railway project settings (Variables tab):

### Supabase Configuration
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from: Supabase Dashboard → Settings → API

### App Configuration (Optional)
```
VITE_APP_NAME=Health Dashboard
VITE_APP_URL=https://your-app.up.railway.app
```

## Deployment Flow

1. **Build**: `npm ci && npm run build`
   - Runs TypeScript compilation
   - Builds Vite app
   - Outputs to `dist/` directory

2. **Start**: `npm start`
   - Generates `dist/config.js` with runtime environment variables
   - Injects `<script src="/config.js">` into `dist/index.html`
   - Serves static files with `serve` on port 8080

## How Runtime Config Works

- **Development**: Uses `import.meta.env` (Vite's built-in env vars)
- **Production**: Uses `window.__ENV__` from injected `/config.js`

The app checks both sources in `src/lib/supabase.ts`:
```typescript
const getEnv = (key: string) => {
  if (typeof window !== 'undefined' && window.__ENV__) {
    return window.__ENV__[key]
  }
  return import.meta.env[key]
}
```

## Testing Locally

```bash
# Build
npm run build

# Start (will generate config.js and serve)
npm start

# Visit http://localhost:8080
```

## Troubleshooting

- **Missing env vars**: Check Railway logs for the "GENERATING RUNTIME CONFIG" section
- **404 on /config.js**: Make sure `npm start` (not `serve` directly) is used
- **Empty window.__ENV__**: Ensure env vars are set in Railway project settings
