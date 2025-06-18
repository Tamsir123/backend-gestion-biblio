// === models/user.model.js ===
const db = require('../config/db');

const findByEmail = (email, callback) => {
  db.query('SELECT * FROM users WHERE email = ?', [email], callback);
};

const findById = (id, callback) => {
  db.query('SELECT * FROM users WHERE id = ?', [id], callback);
};

const create = (user, callback) => {
  db.query('INSERT INTO users SET ?', user, callback);
};

const update = (id, user, callback) => {
  db.query('UPDATE users SET ? WHERE id = ?', [user, id], callback);
};

const deleteUser = (id, callback) => {
  db.query('DELETE FROM users WHERE id = ?', [id], callback);
};

module.exports = {
  findByEmail,
  findById,
  create,
  update,
  deleteUser
};