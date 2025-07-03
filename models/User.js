const { executeQuery, queryOne } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // Créer un nouvel utilisateur
  static async create(userData) {
    const { name, email, password, role = 'student' } = userData;
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Préparer les champs optionnels s'ils sont fournis
    const optionalFields = [];
    const optionalValues = [];
    
    // Liste des champs optionnels autorisés
    const allowedOptionalFields = [
      'phone', 'address', 'date_of_birth', 'country', 'city',
      'student_id', 'department', 'level', 'emergency_contact_name', 
      'emergency_contact_phone', 'bio'
    ];
    
    allowedOptionalFields.forEach(field => {
      if (userData[field] !== undefined && userData[field] !== null && userData[field] !== '') {
        optionalFields.push(field);
        
        // Formater la date de naissance pour MySQL
        if (field === 'date_of_birth') {
          const date = new Date(userData[field]);
          optionalValues.push(date.toISOString().split('T')[0]);
        } else {
          optionalValues.push(userData[field]);
        }
      }
    });
    
    // Construire la requête dynamiquement
    const baseFields = ['name', 'email', 'password', 'role'];
    const allFields = [...baseFields, ...optionalFields];
    const allValues = [name, email, hashedPassword, role, ...optionalValues];
    
    const placeholders = allFields.map(() => '?').join(', ');
    const fieldsStr = allFields.join(', ');
    
    const query = `
      INSERT INTO users (${fieldsStr}) 
      VALUES (${placeholders})
    `;
    
    const result = await executeQuery(query, allValues);
    return result.insertId;
  }
  
  // Trouver un utilisateur par email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ? AND is_active = TRUE';
    return await queryOne(query, [email]);
  }
  
  // Trouver un utilisateur par ID avec détails complets
  static async findById(id) {
    const query = `
      SELECT 
        u.id, u.name, u.email, u.role, u.is_active, u.student_id,
        u.phone, u.address, u.date_of_birth, u.department, u.level,
        u.country, u.city, u.emergency_contact_name, u.emergency_contact_phone,
        u.bio, u.favorite_genres, u.profile_image, u.last_login_at,
        u.created_at, u.updated_at,
        up.notification_email, up.notification_sms, up.language, 
        up.theme, up.privacy_profile, up.receive_recommendations
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = ? AND u.is_active = TRUE
    `;
    return await queryOne(query, [id]);
  }

  // Trouver un utilisateur par ID (version simple pour l'auth)
  static async findByIdSimple(id) {
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
  
  // Lister tous les utilisateurs (admin)
  static async findAll() {
    const query = 'SELECT id, name, email, role, is_active, profile_image, phone, address, date_of_birth, created_at, updated_at FROM users';
    return await executeQuery(query);
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

  // Mettre à jour le profil utilisateur
  static async updateProfile(id, profileData) {
    try {
      const allowedFields = [
        'name', 'phone', 'address', 'date_of_birth', 'department', 
        'level', 'country', 'city', 'emergency_contact_name', 
        'emergency_contact_phone', 'bio', 'favorite_genres', 'profile_image'
      ];
      
      const updateData = {};
      Object.keys(profileData).forEach(key => {
        if (allowedFields.includes(key) && profileData[key] !== undefined) {
          // Formater la date de naissance pour MySQL (DATE format)
          if (key === 'date_of_birth' && profileData[key]) {
            // Convertir ISO string ou Date object en format YYYY-MM-DD
            const date = new Date(profileData[key]);
            updateData[key] = date.toISOString().split('T')[0];
          } else {
            updateData[key] = profileData[key];
          }
        }
      });
      
      if (Object.keys(updateData).length === 0) {
        throw new Error('Aucun champ valide à mettre à jour');
      }
      
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      const query = `
        UPDATE users 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      values.push(id);
      const result = await executeQuery(query, values);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  }

  // Mettre à jour les préférences utilisateur
  static async updatePreferences(userId, preferences) {
    try {
      const allowedPrefs = [
        'notification_email', 'notification_sms', 'language', 
        'theme', 'privacy_profile', 'receive_recommendations'
      ];
      
      const updateData = {};
      Object.keys(preferences).forEach(key => {
        if (allowedPrefs.includes(key) && preferences[key] !== undefined) {
          updateData[key] = preferences[key];
        }
      });
      
      if (Object.keys(updateData).length === 0) {
        return false;
      }
      
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      const query = `
        INSERT INTO user_preferences (user_id, ${fields.join(', ')})
        VALUES (?, ${fields.map(() => '?').join(', ')})
        ON DUPLICATE KEY UPDATE 
        ${setClause}, updated_at = CURRENT_TIMESTAMP
      `;
      
      const result = await executeQuery(query, [userId, ...values, ...values]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
      throw error;
    }
  }

  // Enregistrer une connexion
  static async recordLogin(userId, loginData = {}) {
    try {
      const { ip_address, user_agent, device_type = 'desktop', location } = loginData;
      
      // Mettre à jour last_login_at
      await executeQuery(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );
      
      // Enregistrer dans l'historique
      const query = `
        INSERT INTO user_login_history (user_id, ip_address, user_agent, device_type, location)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      // Convertir undefined en null pour MySQL
      await executeQuery(query, [
        userId, 
        ip_address || null, 
        user_agent || null, 
        device_type || 'desktop', 
        location || null
      ]);
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la connexion:', error);
      return false;
    }
  }

  // Obtenir les statistiques du profil utilisateur
  static async getProfileStats(userId) {
    try {
      const stats = await queryOne(`
        SELECT 
          (SELECT COUNT(*) FROM borrowings WHERE user_id = ? AND status = 'active') as active_borrowings,
          (SELECT COUNT(*) FROM borrowings WHERE user_id = ? AND status = 'returned') as total_returned,
          (SELECT COUNT(*) FROM borrowings WHERE user_id = ?) as total_borrowings,
          (SELECT COUNT(*) FROM reviews WHERE user_id = ?) as total_reviews,
          (SELECT AVG(rating) FROM reviews WHERE user_id = ?) as avg_rating_given,
          (SELECT COUNT(*) FROM user_login_history WHERE user_id = ? AND login_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as logins_last_30_days
      `, [userId, userId, userId, userId, userId, userId]);
      
      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
}

module.exports = User;
