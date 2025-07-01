const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// Lister tous les utilisateurs (admin seulement)
router.get('/', authMiddleware, adminMiddleware, UserController.getAll);

module.exports = router;
