FROM node:20-alpine

WORKDIR /app

# Copier manifest
COPY package*.json ./
COPY prisma ./prisma

# Installer (avec dev deps pour générer Prisma)
RUN npm ci

# Générer Prisma client
RUN npx prisma generate

# (Optionnel) appliquer migrations (si tu commits les migrations)
# RUN npx prisma migrate deploy

# Copier le reste
COPY . .

# Optimiser: retirer dev deps (prisma) après génération
RUN npm prune --production

# Fix OpenSSL pour Prisma sur Alpine Linux (package mis à jour)
RUN apk add --no-cache openssl

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/server.js"]