const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// Test simple pour débugger
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Analytics routes fonctionnent' });
});

// Test sans auth pour débugger
router.get('/dashboard-test', AnalyticsController.getDashboardStats);

// Toutes les routes analytics nécessitent une authentification et des droits admin
router.use(authMiddleware);
router.use(adminMiddleware);

// Route pour obtenir les statistiques du dashboard
router.get('/dashboard', AnalyticsController.getDashboardStats);

// Route pour obtenir les analytics détaillés des emprunts
router.get('/borrowings', AnalyticsController.getBorrowingAnalytics);

// Route pour exporter les données en CSV
router.get('/export/:type', AnalyticsController.exportReport);

module.exports = router;
