const express = require('express');
const router = express.Router();
const BookController = require('../controllers/BookController');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const { 
  validateCreateBook, 
  validateUpdateBook, 
  validateId, 
  validatePagination 
} = require('../middleware/validation.middleware');

// Routes publiques (consultation des livres)
router.get('/', validatePagination, BookController.getAll);
router.get('/search', BookController.search);
router.get('/genres', BookController.getGenres);
router.get('/popular-authors', BookController.getPopularAuthors);
router.get('/:id', validateId, BookController.getById);
router.get('/:id/availability', validateId, BookController.checkAvailability);

// Routes protégées (nécessitent une authentification)
router.use(authMiddleware);

// Routes administrateur uniquement
router.post('/', adminMiddleware, validateCreateBook, BookController.create);
router.put('/:id', adminMiddleware, validateUpdateBook, BookController.update);
router.delete('/:id', adminMiddleware, validateId, BookController.delete);
router.get('/admin/stats', adminMiddleware, BookController.getStats);

module.exports = router;
