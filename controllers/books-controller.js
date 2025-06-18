// === controllers/book.controller.js ===
const Book = require('../models/book-model');

exports.getAll = (req, res) => {
  Book.getAllBooks((err, books) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(books);
  });
};

exports.getById = (req, res) => {
  Book.getBookById(req.params.id, (err, book) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!book.length) return res.status(404).json({ error: 'Livre non trouvé' });
    res.json(book[0]);
  });
};

exports.create = (req, res) => {
  Book.createBook(req.body, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Livre ajouté' });
  });
};

exports.update = (req, res) => {
  Book.updateBook(req.params.id, req.body, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Livre modifié' });
  });
};

exports.remove = (req, res) => {
  Book.deleteBook(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Livre supprimé' });
  });
};