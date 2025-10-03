# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code (including pre-generated PNG icons)
COPY . .

# Build the app
RUN npm run build

# Production stage - use serve to host static files
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Railway sets PORT env variable
EXPOSE 8080

# Serve the static files on port 8080
CMD ["serve", "-s", "dist", "-p", "8080"]
