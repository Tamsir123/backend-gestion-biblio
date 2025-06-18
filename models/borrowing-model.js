// === models/borrow.model.js ===
const db = require('../config/db');

const createBorrowing = (data, callback) => {
  db.query('INSERT INTO borrowings SET ?', data, callback);
};

const getUserBorrowings = (userId, callback) => {
  db.query('SELECT * FROM borrowings WHERE user_id = ?', [userId], callback);
};

module.exports = {
  createBorrowing,
  getUserBorrowings
};
