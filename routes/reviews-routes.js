// === routes/review.routes.js ===
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviews-controller');

router.post('/', reviewController.add);
router.get('/:bookId', reviewController.getByBook);

module.exports = router;