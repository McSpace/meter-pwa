// Generate runtime config from environment variables
import fs from 'fs'

const config = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  VITE_APP_NAME: process.env.VITE_APP_NAME || 'Health Dashboard',
  VITE_APP_URL: process.env.VITE_APP_URL,
}

const configJs = `window.__ENV__ = ${JSON.stringify(config, null, 2)};`

fs.writeFileSync('dist/config.js', configJs)
console.log('✅ Runtime config generated')
