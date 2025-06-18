// === controllers/review.controller.js ===
const Review = require('../models/review-model');

exports.add = (req, res) => {
  Review.addReview(req.body, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Avis ajouté' });
  });
};

exports.getByBook = (req, res) => {
  Review.getReviewsByBook(req.params.bookId, (err, reviews) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(reviews);
  });
};