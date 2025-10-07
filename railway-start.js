// Railway startup script - generates runtime config and serves app
import fs from 'fs'
import { spawn } from 'child_process'

console.log('=== RAILWAY STARTUP ===')
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ SET' : '❌ MISSING')
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? `✅ SET (length: ${process.env.VITE_SUPABASE_ANON_KEY.length})` : '❌ MISSING')

const config = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  VITE_APP_NAME: process.env.VITE_APP_NAME || 'Health Dashboard',
  VITE_APP_URL: process.env.VITE_APP_URL,
}

const configJs = `window.__ENV__ = ${JSON.stringify(config, null, 2)};`

// Write config.js
fs.writeFileSync('config.js', configJs)
console.log('✅ Runtime config generated')

// Inject script tag into index.html
let html = fs.readFileSync('index.html', 'utf-8')
if (!html.includes('/config.js')) {
  html = html.replace(
    '</head>',
    '  <script src="/config.js"></script>\n  </head>'
  )
  fs.writeFileSync('index.html', html)
  console.log('✅ Injected config.js script')
}

console.log('======================')

// Start server
const server = spawn('npx', ['serve', '-s', '.', '-p', '8080'], {
  stdio: 'inherit'
})

server.on('error', (error) => {
  console.error('Server error:', error)
  process.exit(1)
})

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`)
  process.exit(code)
})
