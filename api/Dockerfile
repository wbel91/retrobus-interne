FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create uploads directory
RUN mkdir -p uploads retromail/uploads

# Expose port
EXPOSE 4000

# Set environment
ENV NODE_ENV=production
ENV DATABASE_URL=file:./prisma/dev.db

# Start application
CMD ["node", "src/server.js"]