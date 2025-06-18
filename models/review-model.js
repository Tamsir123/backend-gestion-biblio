// === models/review.model.js ===
const db = require('../config/db');

const addReview = (data, callback) => {
  db.query('INSERT INTO reviews SET ?', data, callback);
};

const getReviewsByBook = (bookId, callback) => {
  db.query('SELECT * FROM reviews WHERE book_id = ?', [bookId], callback);
};

module.exports = {
  addReview,
  getReviewsByBook
};