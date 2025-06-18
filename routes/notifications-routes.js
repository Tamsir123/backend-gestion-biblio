// === routes/notification.routes.js ===
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notifications-controller');

router.post('/', notificationController.send);
router.get('/:userId', notificationController.getByUser);

module.exports = router;