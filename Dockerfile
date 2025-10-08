# syntax=docker/dockerfile:1.4

############################################################
#  Builder stage
############################################################
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time configuration for the Vite application
# These will be provided by Railway environment variables
ARG VITE_APP_NAME
ARG VITE_APP_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_URL

# Expose build arguments to the Vite build
ENV \
  VITE_APP_NAME="${VITE_APP_NAME}" \
  VITE_APP_URL="${VITE_APP_URL}" \
  VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}" \
  VITE_SUPABASE_URL="${VITE_SUPABASE_URL}" \
  VITE_AI_ANALYSIS_API_URL="${VITE_AI_ANALYSIS_API_URL}"

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
