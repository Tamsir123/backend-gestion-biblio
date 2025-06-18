// === routes/borrow.routes.js ===
const express = require('express');
const router = express.Router();
const borrowController = require('../controllers/borrowings-controller');

router.post('/', borrowController.create);
router.get('/:userId', borrowController.getByUser);

module.exports = router;