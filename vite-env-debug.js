// Debug script to check if env vars are available during build
console.log('=== VITE ENV VARS DEBUG ===')
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ SET' : '❌ MISSING')
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING')
console.log('VITE_APP_NAME:', process.env.VITE_APP_NAME ? '✅ SET' : '❌ MISSING')
console.log('VITE_APP_URL:', process.env.VITE_APP_URL ? '✅ SET' : '❌ MISSING')
console.log('===========================')
