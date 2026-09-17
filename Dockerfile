# Stage 1: Build Frontend
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app

# Copy root manifests and frontend package files
COPY package.json ./
COPY frontend/package.json ./frontend/

# Install frontend dependencies (ignoring host package-lock to download Linux native binaries)
RUN cd frontend && npm install --no-package-lock --ignore-scripts

# Copy frontend source and build
COPY frontend ./frontend
RUN cd frontend && npm run build

# Stage 2: Production Runtime
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy root manifests and backend package files
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

# Install backend production dependencies
RUN npm ci --workspace=backend --omit=dev --ignore-scripts

# Copy backend source code
COPY backend ./backend

# Copy built frontend dist from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 4000

CMD ["npm", "start", "--workspace=backend"]
