const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const { body, param } = require('express-validator');

// Validation pour la création d'utilisateur
const validateCreateUser = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('email').isEmail().withMessage('Format d\'email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('role').optional().isIn(['student', 'admin']).withMessage('Rôle invalide')
];

// Validation pour la mise à jour d'utilisateur
const validateUpdateUser = [
  param('id').isInt({ min: 1 }).withMessage('ID utilisateur invalide'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('email').isEmail().withMessage('Format d\'email invalide'),
  body('role').optional().isIn(['student', 'admin']).withMessage('Rôle invalide'),
  body('is_active').optional().isBoolean().withMessage('Le statut actif doit être un booléen')
];

// Validation pour les paramètres ID
const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID utilisateur invalide')
];

// Toutes les routes nécessitent une authentification admin
router.use(authMiddleware, adminMiddleware);

// Lister tous les utilisateurs
router.get('/', UserController.getAll);

// Créer un nouvel utilisateur
router.post('/', validateCreateUser, UserController.create);

// Mettre à jour un utilisateur
router.put('/:id', validateUpdateUser, UserController.update);

// Supprimer un utilisateur
router.delete('/:id', validateId, UserController.delete);

// Obtenir l'historique des emprunts d'un utilisateur
router.get('/:id/borrowings', validateId, UserController.getBorrowingHistory);

// Obtenir les statistiques d'un utilisateur
router.get('/:id/stats', validateId, UserController.getUserStats);

module.exports = router;
