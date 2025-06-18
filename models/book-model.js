// === models/book.model.js ===
const db = require('../config/db');

const getAllBooks = (callback) => {
  db.query('SELECT * FROM books', callback);
};

const getBookById = (id, callback) => {
  db.query('SELECT * FROM books WHERE id = ?', [id], callback);
};

const createBook = (book, callback) => {
  db.query('INSERT INTO books SET ?', book, callback);
};

const updateBook = (id, book, callback) => {
  db.query('UPDATE books SET ? WHERE id = ?', [book, id], callback);
};

const deleteBook = (id, callback) => {
  db.query('DELETE FROM books WHERE id = ?', [id], callback);
};

module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook
};
