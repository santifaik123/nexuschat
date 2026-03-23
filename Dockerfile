# ---- Stage 1: Build admin panel ----
FROM node:20-alpine AS admin-builder
WORKDIR /build
COPY admin/package*.json ./
RUN npm ci
COPY admin/ ./
RUN npm run build

# ---- Stage 2: Production image ----
FROM node:20-alpine
WORKDIR /app

# Install server deps
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy server source
COPY server/ ./server/

# Copy built admin panel
COPY --from=admin-builder /build/dist ./admin/dist/

# Copy widget (pre-built)
COPY widget/dist/ ./widget/dist/

# Copy demo page
COPY examples/ ./examples/

EXPOSE 3000

CMD ["node", "server/src/index.js"]
