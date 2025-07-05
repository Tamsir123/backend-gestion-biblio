const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Configuration de la base de données
const { testConnection } = require('./config/database');

// Importation des routes
const authRoutes = require('./routes/auth-routes');
const bookRoutes = require('./routes/BooksRoutes');
const borrowingRoutes = require('./routes/BorrowingsRoutes');
const reviewRoutes = require('./routes/ReviewRoutes');
const userRoutes = require('./routes/users-routes');
const notificationRoutes = require('./routes/notifications-routes');
const analyticsRoutes = require('./routes/analytics-routes');

// Services
const NotificationScheduler = require('./services/NotificationScheduler');

// Middlewares
const errorHandler = require('./middleware/error.middleware');

const app = express();

// Configuration CORS - Support pour développement local
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:8080'
].filter((v, i, arr) => Boolean(v) && arr.indexOf(v) === i); // Supprime doublons et valeurs vides

app.use(cors({
  origin: (origin, callback) => {
    // Permettre les requêtes sans origine (comme curl, téléchargement direct d'images, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS: Origine non autorisée: ${origin}`);
      console.log(`✅ Origines autorisées: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware pour parser JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (images uploadées)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route de santé
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '📚 API Gestion de Bibliothèque - Serveur actif',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: [
      '✅ Authentification JWT',
      '✅ Gestion des livres',
      '✅ Système d\'emprunts',
      '✅ Système d\'avis et commentaires',
      '✅ Notifications par email',
      '✅ Tâches automatiques',
      '✅ Dashboard analytics'
    ]
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
// Log global pour toutes les requêtes PUT sur /api/books/:id
app.use('/api/books/:id', (req, res, next) => {
  if (req.method === 'PUT') {
    console.log('[DEBUG PUT /api/books/:id] Headers:', req.headers);
    console.log('[DEBUG PUT /api/books/:id] Body:', req.body);
  }
  next();
});
app.use('/api/borrowings', borrowingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user', userRoutes.userProfileRoutes); // Routes de profil utilisateur
app.use('/api/notifications', notificationRoutes); // Routes de notifications
app.use('/api/analytics', analyticsRoutes); // Routes analytics pour le dashboard

// Route 404 pour les endpoints non trouvés
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint non trouvé',
    path: req.originalUrl
  });
});

// Middleware de gestion des erreurs (doit être en dernier)
app.use(errorHandler);

// Démarrage du serveur
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test de connexion à la base de données
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Impossible de démarrer le serveur : échec de connexion à la base de données');
      process.exit(1);
    }
    
    // Démarrage du serveur HTTP
    app.listen(PORT, () => {
      console.log('\n🚀 ================================');
      console.log('📚 API Gestion de Bibliothèque');
      console.log('================================');
      console.log(`✅ Serveur démarré sur le port ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log('✨ Fonctionnalités actives:');
      console.log('   📚 Gestion des livres');
      console.log('   👥 Authentification utilisateurs');
      console.log('   📄 Système d\'emprunts');
      console.log('   ⭐ Avis et commentaires');
      console.log('   📧 Notifications par email');
      console.log('   🕐 Tâches automatiques');
      console.log('   📊 Dashboard analytics');
      console.log('================================\n');
      
      // Démarrer le planificateur de notifications
      NotificationScheduler.start();
      
      // Affichage des routes disponibles en mode développement
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 Routes disponibles:');
        console.log('Auth: http://localhost:' + PORT + '/api/auth/*');
        console.log('Books: http://localhost:' + PORT + '/api/books/*');
        console.log('Borrowings: http://localhost:' + PORT + '/api/borrowings/*');
        console.log('Reviews: http://localhost:' + PORT + '/api/reviews/*');
        console.log('Notifications: http://localhost:' + PORT + '/api/notifications/*');
        console.log('Analytics: http://localhost:' + PORT + '/api/analytics/*\n');
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error.message);
    process.exit(1);
  }
};

// Gestion gracieuse de l'arrêt du serveur
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu. Arrêt gracieux du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Signal SIGINT reçu. Arrêt gracieux du serveur...');
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  process.exit(1);
});

// Démarrer le serveur
startServer();
