// === models/notification.model.js ===
const db = require('../config/db');

const sendNotification = (data, callback) => {
  db.query('INSERT INTO notifications SET ?', data, callback);
};

const getUserNotifications = (userId, callback) => {
  db.query('SELECT * FROM notifications WHERE user_id = ?', [userId], callback);
};

module.exports = {
  sendNotification,
  getUserNotifications
};