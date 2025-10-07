// Generate runtime config from environment variables
import fs from 'fs'

console.log('=== GENERATING RUNTIME CONFIG ===')
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ SET' : '❌ MISSING')
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? `✅ SET (length: ${process.env.VITE_SUPABASE_ANON_KEY.length})` : '❌ MISSING')

const config = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  VITE_APP_NAME: process.env.VITE_APP_NAME || 'Health Dashboard',
  VITE_APP_URL: process.env.VITE_APP_URL,
}

// Check if dist directory exists
if (!fs.existsSync('dist')) {
  console.error('❌ dist directory not found! Make sure build completed.')
  process.exit(1)
}

const configJs = `window.__ENV__ = ${JSON.stringify(config, null, 2)};`

fs.writeFileSync('dist/config.js', configJs)
console.log('✅ Runtime config generated at dist/config.js')
console.log('Config content preview:', JSON.stringify(config, null, 2))

// Inject config.js script into dist/index.html
const indexPath = 'dist/index.html'
let html = fs.readFileSync(indexPath, 'utf-8')
if (!html.includes('/config.js')) {
  html = html.replace(
    '</head>',
    '  <script src="/config.js"></script>\n  </head>'
  )
  fs.writeFileSync(indexPath, html)
  console.log('✅ Injected config.js script into dist/index.html')
}

console.log('=================================')
