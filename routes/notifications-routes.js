const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// Routes protégées (utilisateur connecté)
router.use(authMiddleware);

// Routes utilisateur
router.get('/', NotificationController.getUserNotifications);
router.put('/:notificationId/read', NotificationController.markAsRead);
router.put('/mark-all-read', NotificationController.markAllAsRead);

// Routes admin
router.get('/stats', adminMiddleware, NotificationController.getNotificationStats);
router.post('/test-email', adminMiddleware, NotificationController.testEmailConfiguration);
router.post('/send-overdue', adminMiddleware, NotificationController.sendOverdueNotifications);
router.post('/send-reminders', adminMiddleware, NotificationController.sendReminders);
router.delete('/cleanup', adminMiddleware, NotificationController.cleanupOldNotifications);

module.exports = router;
