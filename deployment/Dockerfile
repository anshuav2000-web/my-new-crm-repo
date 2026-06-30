# --- STAGE 1: Build Frontend and Backend ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy the entire workspace
COPY . .

# Build both frontend assets and compile backend server
RUN npm run build

# --- STAGE 2: Run Production Server ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled files and assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server
COPY --from=builder /app/attached_assets ./attached_assets

# Expose production port
EXPOSE 5000

# Start Express server hosting both API and production build of the frontend
CMD ["node", "dist/index.cjs"]
