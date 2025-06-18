const { executeQuery, queryOne } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // Créer un nouvel utilisateur
  static async create(userData) {
    const { name, email, password, role = 'student' } = userData;
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const query = `
      INSERT INTO users (name, email, password, role) 
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await executeQuery(query, [name, email, hashedPassword, role]);
    return result.insertId;
  }
  
  // Trouver un utilisateur par email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ? AND is_active = TRUE';
    return await queryOne(query, [email]);
  }
  
  // Trouver un utilisateur par ID
  static async findById(id) {
    const query = `
      SELECT id, name, email, role, is_active, created_at, updated_at 
      FROM users 
      WHERE id = ? AND is_active = TRUE
    `;
    return await queryOne(query, [id]);
  }
  
  // Vérifier le mot de passe
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  
  // Obtenir tous les utilisateurs (admin only)
  static async findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT id, name, email, role, is_active, created_at,
             (SELECT COUNT(*) FROM borrowings WHERE user_id = users.id AND status = 'active') as active_borrowings
      FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const users = await executeQuery(query, [limit, offset]);
    
    // Compter le total
    const countQuery = 'SELECT COUNT(*) as total FROM users';
    const [{ total }] = await executeQuery(countQuery);
    
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  // Mettre à jour un utilisateur
  static async update(id, userData) {
    const { name, email, role, is_active } = userData;
    
    const query = `
      UPDATE users 
      SET name = ?, email = ?, role = ?, is_active = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    const result = await executeQuery(query, [name, email, role, is_active, id]);
    return result.affectedRows > 0;
  }
  
  // Supprimer un utilisateur (soft delete)
  static async softDelete(id) {
    const query = 'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.affectedRows > 0;
  }
  
  // Compter les utilisateurs actifs
  static async countActive() {
    const query = 'SELECT COUNT(*) as count FROM users WHERE is_active = TRUE';
    const result = await queryOne(query);
    return result.count;
  }
  
  // Statistiques utilisateur
  static async getStats(userId) {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM borrowings WHERE user_id = ? AND status = 'active') as active_borrowings,
        (SELECT COUNT(*) FROM borrowings WHERE user_id = ? AND status = 'returned') as total_borrowed,
        (SELECT COUNT(*) FROM borrowings WHERE user_id = ? AND status = 'overdue') as overdue_books,
        (SELECT COUNT(*) FROM reviews WHERE user_id = ?) as reviews_given,
        (SELECT AVG(rating) FROM reviews WHERE user_id = ?) as average_rating_given
    `;
    
    return await queryOne(query, [userId, userId, userId, userId, userId]);
  }
}

module.exports = User;
