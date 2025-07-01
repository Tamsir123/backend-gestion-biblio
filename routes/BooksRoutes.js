const express = require('express');
const router = express.Router();
const BookController = require('../controllers/BookController');
const ReviewController = require('../controllers/ReviewController');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const uploadCover = require('../middleware/uploadCover.middleware');
const { 
  validateCreateBook, 
  validateUpdateBook, 
  validateId, 
  validatePagination 
} = require('../middleware/validation.middleware');
const { body } = require('express-validator');

// Validation pour créer un avis
const validateCreateReview = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
  body('comment').optional().isLength({ max: 1000 }).withMessage('Le commentaire ne peut pas dépasser 1000 caractères')
];

// Routes publiques (consultation des livres)
router.get('/', validatePagination, BookController.getAll);
router.get('/search', BookController.search);
router.get('/genres', BookController.getGenres);
router.get('/popular-authors', BookController.getPopularAuthors);
router.get('/:id', validateId, BookController.getById);
router.get('/:id/availability', validateId, BookController.checkAvailability);

// Routes publiques pour les reviews
router.get('/:id/reviews', validateId, ReviewController.getBookReviews);
router.get('/:id/stats', validateId, ReviewController.getBookStats);

// Routes protégées (nécessitent une authentification)
router.use(authMiddleware);

// Routes pour les reviews (utilisateurs connectés)
router.post('/:id/reviews', validateId, validateCreateReview, (req, res, next) => {
  // Ajouter book_id depuis l'URL
  req.body.book_id = parseInt(req.params.id);
  next();
}, ReviewController.create);

// Routes administrateur uniquement
router.post('/', adminMiddleware, uploadCover.single('cover_image'), validateCreateBook, BookController.create);
router.put('/:id', adminMiddleware, validateUpdateBook, BookController.update);
router.delete('/:id', adminMiddleware, validateId, BookController.delete);
router.get('/admin/stats', adminMiddleware, BookController.getStats);

module.exports = router;
