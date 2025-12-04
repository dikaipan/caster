FROM node:18-alpine AS development

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package files (including package-lock.json)
COPY package*.json ./
COPY package-lock.json* ./

# Install all dependencies (including devDependencies untuk build)
# Use npm install if package-lock.json doesn't exist, otherwise use npm ci
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      echo "WARNING: package-lock.json not found, using npm install"; \
      npm install; \
    fi

# Copy all source code first (this should include prisma folder)
COPY . .

# Verify prisma schema exists, if not, show error with directory listing
RUN if [ ! -f prisma/schema.prisma ]; then \
      echo "ERROR: prisma/schema.prisma not found!"; \
      echo "Current directory contents:"; \
      ls -la; \
      echo "Prisma directory contents:"; \
      ls -la prisma/ 2>/dev/null || echo "prisma/ directory does not exist"; \
      exit 1; \
    fi

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Remove devDependencies setelah build
RUN npm prune --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

EXPOSE 3000

# Health check (endpoint: /api/health)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "run", "start:prod"]

