const express = require('express');
const router = express.Router();
const ReviewController = require('../controllers/ReviewController');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const { body, param } = require('express-validator');

// Validation pour créer un avis
const validateCreateReview = [
  body('book_id').isInt({ min: 1 }).withMessage('ID du livre invalide'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
  body('comment').optional().isLength({ max: 1000 }).withMessage('Le commentaire ne peut pas dépasser 1000 caractères')
];

// Validation pour mettre à jour un avis
const validateUpdateReview = [
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
  body('comment').optional().isLength({ max: 1000 }).withMessage('Le commentaire ne peut pas dépasser 1000 caractères')
];

// Validation pour l'ID
const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID invalide')
];

// Routes publiques
router.get('/book/:id', validateId, ReviewController.getBookReviews);
router.get('/book/:id/stats', validateId, ReviewController.getBookStats);

// Routes authentifiées
router.use(authMiddleware);

// Gestion des avis pour les utilisateurs connectés
router.post('/', validateCreateReview, ReviewController.create);
router.get('/my-reviews', ReviewController.getMyReviews);
router.put('/:id', validateId, validateUpdateReview, ReviewController.update);
router.delete('/:id', validateId, ReviewController.delete);

// Routes administrateur
router.get('/pending', adminMiddleware, ReviewController.getPendingReviews);
router.put('/:id/moderate', adminMiddleware, validateId, ReviewController.moderate);

module.exports = router;
