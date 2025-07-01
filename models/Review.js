const { executeQuery, queryOne } = require('../config/database');

class Review {
  // Créer un nouvel avis
  static async create(reviewData) {
    const { user_id, book_id, rating, comment } = reviewData;
    
    // Vérifier qu'un avis n'existe pas déjà pour ce livre par cet utilisateur
    const existingReview = await queryOne(
      'SELECT id FROM reviews WHERE user_id = ? AND book_id = ?', 
      [user_id, book_id]
    );
    
    if (existingReview) {
      throw new Error('Vous avez déjà donné un avis pour ce livre');
    }
    
    const query = `
      INSERT INTO reviews (user_id, book_id, rating, comment, is_approved) 
      VALUES (?, ?, ?, ?, TRUE)
    `;
    
    const result = await executeQuery(query, [user_id, book_id, rating, comment]);
    return result.insertId;
  }
  
  // Obtenir tous les avis d'un livre
  static async findByBookId(bookId, page = 1, limit = 10) {
    try {
      // Validation et nettoyage des paramètres
      const validPage = Math.max(1, parseInt(page) || 1);
      const validLimit = Math.max(1, Math.min(50, parseInt(limit) || 10));
      const offset = (validPage - 1) * validLimit;
      const validBookId = parseInt(bookId);
      
      if (!validBookId || isNaN(validBookId)) {
        throw new Error('ID de livre invalide');
      }
      
      console.log('findByBookId - Paramètres:', { bookId: validBookId, page: validPage, limit: validLimit, offset });
      
      const query = `
        SELECT r.*, u.name as user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.book_id = ? AND r.is_approved = TRUE
        ORDER BY r.created_at DESC
        LIMIT ${validLimit} OFFSET ${offset}
      `;
      
      const reviews = await executeQuery(query, [validBookId]);
      
      // Compter le total
      const countQuery = 'SELECT COUNT(*) as total FROM reviews WHERE book_id = ? AND is_approved = TRUE';
      const countResult = await executeQuery(countQuery, [validBookId]);
      const total = countResult[0]?.total || 0;
      
      return {
        reviews,
        pagination: {
          page: validPage,
          limit: validLimit,
          total: parseInt(total),
          totalPages: Math.ceil(total / validLimit)
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des avis:', error);
      throw error;
    }
  }
  
  // Obtenir les avis d'un utilisateur
  static async findByUserId(userId, page = 1, limit = 10) {
    try {
      // Validation et nettoyage des paramètres
      const validPage = Math.max(1, parseInt(page) || 1);
      const validLimit = Math.max(1, Math.min(50, parseInt(limit) || 10));
      const offset = (validPage - 1) * validLimit;
      const validUserId = parseInt(userId);
      
      if (!validUserId || isNaN(validUserId)) {
        throw new Error('ID utilisateur invalide');
      }
      
      const query = `
        SELECT r.*, b.title as book_title, b.author as book_author
        FROM reviews r
        JOIN books b ON r.book_id = b.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
        LIMIT ${validLimit} OFFSET ${offset}
      `;
      
      const reviews = await executeQuery(query, [validUserId]);
      
      const countQuery = 'SELECT COUNT(*) as total FROM reviews WHERE user_id = ?';
      const countResult = await executeQuery(countQuery, [validUserId]);
      const total = countResult[0]?.total || 0;
      
      return {
        reviews,
        pagination: {
          page: validPage,
          limit: validLimit,
          total: parseInt(total),
          totalPages: Math.ceil(total / validLimit)
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des avis utilisateur:', error);
      throw error;
    }
  }
  
  // Mettre à jour un avis
  static async update(reviewId, userId, updateData) {
    const { rating, comment } = updateData;
    
    const query = `
      UPDATE reviews 
      SET rating = ?, comment = ?, updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `;
    
    const result = await executeQuery(query, [rating, comment, reviewId, userId]);
    return result.affectedRows > 0;
  }
  
  // Supprimer un avis
  static async delete(reviewId, userId) {
    const query = 'DELETE FROM reviews WHERE id = ? AND user_id = ?';
    const result = await executeQuery(query, [reviewId, userId]);
    return result.affectedRows > 0;
  }
  
  // Obtenir les statistiques d'un livre
  static async getBookStats(bookId) {
    const query = `
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM reviews 
      WHERE book_id = ? AND is_approved = TRUE
    `;
    
    return await queryOne(query, [bookId]);
  }
  
  // Modération des avis (admin)
  static async moderate(reviewId, isApproved) {
    const query = 'UPDATE reviews SET is_approved = ?, updated_at = NOW() WHERE id = ?';
    const result = await executeQuery(query, [isApproved, reviewId]);
    return result.affectedRows > 0;
  }
  
  // Obtenir tous les avis en attente de modération (admin)
  static async getPendingReviews() {
    const query = `
      SELECT r.*, u.name as user_name, b.title as book_title
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN books b ON r.book_id = b.id
      WHERE r.is_approved = FALSE
      ORDER BY r.created_at DESC
    `;
    
    return await executeQuery(query);
  }
}

module.exports = Review;
