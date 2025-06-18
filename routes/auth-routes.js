// === routes/auth-routes.js ===
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');
const authMiddleware = require('../middleware/auth.middleware');

// Route d'inscription
router.post('/register', authController.register);

// Route de connexion
router.post('/login', authController.login);

// Route pour obtenir le profil (protégée)
router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;
