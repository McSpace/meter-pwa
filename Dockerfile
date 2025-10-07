# syntax=docker/dockerfile:1.4

############################################################
#  Builder stage
############################################################
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time configuration for the Vite application
# These defaults can be overridden with `--build-arg`.
ARG VITE_APP_NAME="Health Dashboard"
ARG VITE_APP_URL="https://meter-pwa-production.up.railway.app"
ARG VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92c3Z1d3N6Z2R3a2d2ZG1ib3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MTE5NTgsImV4cCI6MjA3NTA4Nzk1OH0.ZBd-D03mcPc9PbZUNXZ7gEqJ04qqtNfEmifjCWxF0B0"
ARG VITE_SUPABASE_URL="https://ovsvuwszgdwkgvdmboxo.supabase.co"

# Expose build arguments to the Vite build
ENV \
  VITE_APP_NAME="${VITE_APP_NAME}" \
  VITE_APP_URL="${VITE_APP_URL}" \
  VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}" \
  VITE_SUPABASE_URL="${VITE_SUPABASE_URL}"

# Install dependencies using the lockfile for reproducible builds
COPY package*.json ./
RUN npm ci

# Copy the rest of the application source
COPY . .

# Build the static assets
RUN npm run build

############################################################
#  Runtime stage
############################################################
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Copy the pre-built static assets from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the lightweight static server used by the project
COPY --from=builder /app/serve.js ./serve.js

# Expose the default port used by the app
EXPOSE 8080

# Allow overriding the port through the PORT environment variable
CMD ["node", "./serve.js"]
