# Stage 1: Build Frontend
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app

# Copy root manifests and package files
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install workspace dependencies at root to hoist single React instance and download Linux native bindings
RUN npm install --no-package-lock --ignore-scripts

# Copy frontend source and build
COPY frontend ./frontend
RUN npm run build -w frontend

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
