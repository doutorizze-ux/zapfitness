# Stage 1: Build the Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# Stage 2: Build the Server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production Runtime
FROM node:20-alpine
WORKDIR /app

# Copy built Client to expected location
COPY --from=client-builder /app/client/dist ./client/dist

# Setup Server
WORKDIR /app/server
COPY server/package*.json ./
# Install ONLY production dependencies
RUN npm install --production

# Copy built Server
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/prisma ./prisma

# Generate Prisma Client (needed for runtime)
RUN npx prisma generate

# Expose Port
EXPOSE 3000

# Start Command
CMD ["npm", "run", "start"]
