const express = require('express');
const router = express.Router();
const BorrowingController = require('../controllers/BorrowingController');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const { 
  validateCreateBorrowing, 
  validateRenewBorrowing, 
  validateId, 
  validatePagination 
} = require('../middleware/validation.middleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Routes pour les étudiants et admins
router.post('/', validateCreateBorrowing, BorrowingController.create);
router.get('/my-borrowings', validatePagination, BorrowingController.getMyBorrowings);
router.put('/:id/return', validateId, BorrowingController.returnBook);
router.put('/:id/renew', validateRenewBorrowing, BorrowingController.renew);

// Routes administrateur uniquement
router.get('/', adminMiddleware, validatePagination, BorrowingController.getAll);
router.get('/overdue', adminMiddleware, BorrowingController.getOverdue);
router.get('/due-soon', adminMiddleware, BorrowingController.getDueSoon);
router.get('/stats', adminMiddleware, BorrowingController.getStats);
router.get('/book/:id/history', adminMiddleware, validateId, validatePagination, BorrowingController.getBookHistory);

module.exports = router;
