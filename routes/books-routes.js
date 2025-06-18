// === routes/book.routes.js ===
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/books-controller');

router.get('/', bookController.getAll);
router.get('/:id', bookController.getById);
router.post('/', bookController.create);
router.put('/:id', bookController.update);
router.delete('/:id', bookController.remove);

module.exports = router;