const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/auth.middleware');
const { 
  validateRegister, 
  validateLogin, 
  validateUpdateProfile 
} = require('../middleware/validation.middleware');

// Routes publiques
router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);

// Routes protégées (nécessitent une authentification)
router.use(authMiddleware); // Applique l'authentification à toutes les routes suivantes

router.get('/profile', AuthController.getProfile);
router.put('/profile', validateUpdateProfile, AuthController.updateProfile);
router.post('/verify-token', AuthController.verifyToken);
router.post('/logout', AuthController.logout);

module.exports = router;
