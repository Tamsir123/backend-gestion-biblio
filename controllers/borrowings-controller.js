// === controllers/borrow.controller.js ===
const Borrow = require('../models/borrowing-model');

exports.create = (req, res) => {
  Borrow.createBorrowing(req.body, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Emprunt enregistré' });
  });
};

exports.getByUser = (req, res) => {
  Borrow.getUserBorrowings(req.params.userId, (err, borrowings) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(borrowings);
  });
};