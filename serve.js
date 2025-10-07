#!/usr/bin/env node
import { spawn } from 'child_process'

const port = process.env.PORT || '8080'
console.log(`Starting server on port ${port}`)

const server = spawn('npx', ['serve', '-s', 'dist', '-l', port], {
  stdio: 'inherit'
})

server.on('error', (error) => {
  console.error('Server error:', error)
  process.exit(1)
})

server.on('exit', (code) => {
  process.exit(code || 0)
})
