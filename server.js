// // server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db'); // Connexion DB
const errorHandler = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth-routes');
const bookRoutes = require('./routes/books-routes');
const borrowRoutes = require('./routes/borrowings-routes');
const reviewRoutes = require('./routes/reviews-routes');
const notificationRoutes = require('./routes/notifications-routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes (exemple)
app.get('/', (req, res) => {
  res.send('Bienvenue sur l’API de la bibliothèque 📚');
});
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/borrowings', borrowRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);

// Middleware de gestion des erreurs (doit être en dernier)
app.use(errorHandler);

// Lancer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
});
