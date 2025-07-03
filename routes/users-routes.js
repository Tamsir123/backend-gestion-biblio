const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const uploadProfile = require('../middleware/uploadProfile.middleware');
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

// Validation pour la mise à jour du profil
const validateProfileUpdate = [
  body('name').optional({ values: 'falsy' }).trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('Numéro de téléphone trop long'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('Adresse trop longue'),
  body('date_of_birth').optional({ values: 'falsy' }).custom((value) => {
    if (value && value !== null && value !== '') {
      if (!value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error('Format de date invalide (YYYY-MM-DD requis)');
      }
    }
    return true;
  }),
  body('department').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Département trop long'),
  body('level').optional({ values: 'falsy' }).custom((value) => {
    if (value && value !== null && value !== '') {
      if (!['L1', 'L2', 'L3', 'M1', 'M2', 'PhD'].includes(value)) {
        throw new Error('Niveau d\'études invalide');
      }
    }
    return true;
  }),
  body('country').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Pays trop long'),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Ville trop longue'),
  body('emergency_contact_name').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Nom du contact d\'urgence trop long'),
  body('emergency_contact_phone').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('Téléphone du contact d\'urgence trop long'),
  body('bio').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Bio trop longue (max 1000 caractères)'),
  body('favorite_genres').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Genres préférés trop longs'),
  body('notification_email').optional({ values: 'falsy' }).custom((value) => {
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value !== 'boolean') {
        throw new Error('Notification email doit être un booléen');
      }
    }
    return true;
  }),
  body('notification_sms').optional({ values: 'falsy' }).custom((value) => {
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value !== 'boolean') {
        throw new Error('Notification SMS doit être un booléen');
      }
    }
    return true;
  }),
  body('language').optional({ values: 'falsy' }).custom((value) => {
    if (value && value !== null && value !== '') {
      if (!['fr', 'en'].includes(value)) {
        throw new Error('Langue invalide');
      }
    }
    return true;
  }),
  body('theme').optional({ values: 'falsy' }).custom((value) => {
    if (value && value !== null && value !== '') {
      if (!['light', 'dark', 'auto'].includes(value)) {
        throw new Error('Thème invalide');
      }
    }
    return true;
  }),
  body('privacy_profile').optional({ values: 'falsy' }).custom((value) => {
    if (value && value !== null && value !== '') {
      if (!['public', 'friends', 'private'].includes(value)) {
        throw new Error('Paramètre de confidentialité invalide');
      }
    }
    return true;
  }),
  body('receive_recommendations').optional({ values: 'falsy' }).custom((value) => {
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value !== 'boolean') {
        throw new Error('Recommandations doit être un booléen');
      }
    }
    return true;
  })
];

// Validation pour le changement de mot de passe
const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
  body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('La confirmation du mot de passe ne correspond pas');
    }
    return true;
  })
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

// Routes publiques pour les profils utilisateur (avec authentification)
const userProfileRoutes = express.Router();

// Appliquer l'authentification pour les routes de profil
userProfileRoutes.use(authMiddleware);

// Obtenir le profil de l'utilisateur connecté
userProfileRoutes.get('/profile', UserController.getProfile);

// Mettre à jour le profil de l'utilisateur connecté
userProfileRoutes.put('/profile', validateProfileUpdate, UserController.updateProfile);

// Télécharger une image de profil
userProfileRoutes.post('/profile/image', uploadProfile.single('profile_image'), UserController.uploadProfileImage);

// Changer le mot de passe
userProfileRoutes.put('/profile/password', validatePasswordChange, UserController.changePassword);

// Supprimer le compte utilisateur
userProfileRoutes.delete('/profile', UserController.deleteAccount);

// Exporter les routes de profil séparément
router.userProfileRoutes = userProfileRoutes;

module.exports = router;
