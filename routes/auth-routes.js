const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/auth.middleware');
const { 
  validateRegister, 
  validateLogin
} = require('../middleware/validation.middleware');

// Routes publiques
router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);

// Route de test pour la détection automatique des rôles
router.get('/test-role-detection', AuthController.testRoleDetection);

// Routes protégées (nécessitent une authentification)
router.use(authMiddleware); // Applique l'authentification à toutes les routes suivantes

// Route de test pour vérifier l'authentification
router.get('/test-auth', (req, res) => {
  res.json({
    success: true,
    message: 'Authentification réussie',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

router.get('/profile', AuthController.getProfile);
router.post('/change-password', AuthController.changePassword);

module.exports = router;
