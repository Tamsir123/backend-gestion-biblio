// Script de démarrage optimisé pour Render
const { execSync } = require('child_process');

console.log('🚀 Démarrage du backend sur Render...');

// Vérifier les variables d'environnement critiques
const requiredEnvs = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

if (missingEnvs.length > 0) {
  console.error('❌ Variables d\'environnement manquantes:', missingEnvs.join(', '));
  process.exit(1);
}

console.log('✅ Variables d\'environnement configurées');

// Démarrer l'application
require('./server.js');
