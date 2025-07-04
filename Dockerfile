# Utiliser l'image officielle Node.js
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json du backend
COPY backend-gestion-biblio/package*.json ./

# Installer les dépendances
RUN npm ci --only=production && npm cache clean --force

# Copier le reste du code backend
COPY backend-gestion-biblio/ .

# Créer le répertoire uploads avec les bonnes permissions
RUN mkdir -p /app/uploads/covers /app/uploads/profiles && \
    chown -R node:node /app/uploads

# Exposer le port
EXPOSE 5000

# Définir l'utilisateur non-root pour la sécurité
USER node

# Commande pour démarrer l'application
CMD ["node", "server.js"]
