// === controllers/notification.controller.js ===
const Notification = require('../models/notification-model');

exports.send = (req, res) => {
  Notification.sendNotification(req.body, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Notification envoyée' });
  });
};

exports.getByUser = (req, res) => {
  Notification.getUserNotifications(req.params.userId, (err, notifications) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(notifications);
  });
};