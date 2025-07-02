const { executeQuery, queryOne, transaction } = require('../config/database');

class Borrowing {
  // Créer un nouvel emprunt
  static async create(borrowingData) {
    const { user_id, book_id, due_date, notes } = borrowingData;
    // Remplacer undefined par null pour éviter les erreurs SQL
    const safeNotes = notes === undefined ? null : notes;
    
    return await transaction(async (connection) => {
      // Vérifier la disponibilité du livre
      const [bookCheck] = await connection.execute(
        'SELECT available_quantity FROM books WHERE id = ? FOR UPDATE',
        [book_id]
      );
      
      if (!bookCheck.length || bookCheck[0].available_quantity <= 0) {
        throw new Error('Ce livre n\'est pas disponible pour l\'emprunt');
      }
      
      // Vérifier si l'utilisateur n'a pas déjà emprunté ce livre
      const [existingBorrow] = await connection.execute(
        'SELECT id FROM borrowings WHERE user_id = ? AND book_id = ? AND status = "active"',
        [user_id, book_id]
      );
      
      if (existingBorrow.length > 0) {
        throw new Error('Vous avez déjà emprunté ce livre');
      }
      
      // Créer l'emprunt
      const [borrowResult] = await connection.execute(
        'INSERT INTO borrowings (user_id, book_id, due_date, notes) VALUES (?, ?, ?, ?)',
        [user_id, book_id, due_date, safeNotes]
      );
      
      // Mettre à jour la quantité disponible
      await connection.execute(
        'UPDATE books SET available_quantity = available_quantity - 1 WHERE id = ?',
        [book_id]
      );
      
      return borrowResult.insertId;
    });
  }
  
  // Retourner un livre
  static async returnBook(borrowingId, notes = null) {
    return await transaction(async (connection) => {
      // Obtenir les détails de l'emprunt
      const [borrowingDetails] = await connection.execute(
        'SELECT book_id, status FROM borrowings WHERE id = ? FOR UPDATE',
        [borrowingId]
      );
      
      if (!borrowingDetails.length) {
        throw new Error('Emprunt non trouvé');
      }
      
      if (borrowingDetails[0].status === 'returned') {
        throw new Error('Ce livre a déjà été retourné');
      }
      
      // Marquer comme retourné
      await connection.execute(
        'UPDATE borrowings SET status = "returned", returned_at = NOW(), notes = ? WHERE id = ?',
        [notes, borrowingId]
      );
      
      // Mettre à jour la quantité disponible
      await connection.execute(
        'UPDATE books SET available_quantity = available_quantity + 1 WHERE id = ?',
        [borrowingDetails[0].book_id]
      );
      
      return true;
    });
  }
  
  // Obtenir les emprunts d'un utilisateur
  static async findByUserId(userId, status = null, page = 1, limit = 20) {
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const offset = (validPage - 1) * validLimit;
    
    let whereClause = 'WHERE br.user_id = ?';
    let params = [userId];
    
    if (status) {
      whereClause += ' AND br.status = ?';
      params.push(status);
    }
    
    const query = `
      SELECT br.*, 
             b.title, b.author, b.isbn, b.cover_image,
             CASE 
               WHEN br.status = 'active' AND br.due_date < NOW() THEN 'overdue'
               ELSE br.status 
             END as current_status,
             DATEDIFF(NOW(), br.due_date) as days_overdue
      FROM borrowings br
      JOIN books b ON br.book_id = b.id
      ${whereClause}
      ORDER BY br.borrowed_at DESC
      LIMIT ${validLimit} OFFSET ${offset}
    `;
    
    const borrowings = await executeQuery(query, params);
    
    // Compter le total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM borrowings br 
      ${whereClause}
    `;
    const [{ total }] = await executeQuery(countQuery, params);
    
    return {
      borrowings,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit)
      }
    };
  }
  
  // Obtenir tous les emprunts (admin)
  static async findAll(filters = {}, page = 1, limit = 20) {
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const offset = (validPage - 1) * validLimit;
    
    let whereConditions = [];
    let params = [];
    
    if (filters.status) {
      whereConditions.push('br.status = ?');
      params.push(filters.status);
    }
    
    if (filters.user_id) {
      whereConditions.push('br.user_id = ?');
      params.push(filters.user_id);
    }
    
    if (filters.book_id) {
      whereConditions.push('br.book_id = ?');
      params.push(filters.book_id);
    }
    
    if (filters.overdue_only) {
      whereConditions.push('br.status = "active" AND br.due_date < NOW()');
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    const query = `
      SELECT br.*, 
             u.name as user_name, u.email as user_email,
             b.title, b.author, b.isbn, b.cover_image,
             CASE 
               WHEN br.status = 'active' AND br.due_date < NOW() THEN 'overdue'
               ELSE br.status 
             END as current_status,
             DATEDIFF(NOW(), br.due_date) as days_overdue
      FROM borrowings br
      JOIN users u ON br.user_id = u.id
      JOIN books b ON br.book_id = b.id
      ${whereClause}
      ORDER BY br.borrowed_at DESC
      LIMIT ${validLimit} OFFSET ${offset}
    `;
    
    const borrowings = await executeQuery(query, params);
    
    // Compter le total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM borrowings br 
      JOIN users u ON br.user_id = u.id
      JOIN books b ON br.book_id = b.id
      ${whereClause}
    `;
    const countParams = params.slice(0, -2);
    const [{ total }] = await executeQuery(countQuery, countParams);
    
    return {
      borrowings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  // Renouveler un emprunt
  static async renew(borrowingId, newDueDate) {
    const query = `
      UPDATE borrowings 
      SET due_date = ?, renewal_count = renewal_count + 1, updated_at = NOW()
      WHERE id = ? AND status = 'active' AND renewal_count < 2
    `;
    
    const result = await executeQuery(query, [newDueDate, borrowingId]);
    
    if (result.affectedRows === 0) {
      throw new Error('Impossible de renouveler cet emprunt (limite atteinte ou emprunt non actif)');
    }
    
    return true;
  }
   // Obtenir les emprunts en retard
  static async getOverdue() {
    const query = `
      SELECT br.*, 
             u.name as user_name, u.email as user_email,
             b.title, b.author, b.cover_image,
             DATEDIFF(NOW(), br.due_date) as days_overdue
      FROM borrowings br
      JOIN users u ON br.user_id = u.id
      JOIN books b ON br.book_id = b.id
      WHERE br.status = 'active' AND br.due_date < NOW()
      ORDER BY br.due_date ASC
    `;
    
    return await executeQuery(query);
  }

  // Obtenir les emprunts qui arrivent à échéance
  static async getDueSoon(days = 3) {
    const query = `
      SELECT br.*, 
             u.name as user_name, u.email as user_email,
             b.title, b.author, b.cover_image,
             DATEDIFF(br.due_date, NOW()) as days_until_due
      FROM borrowings br
      JOIN users u ON br.user_id = u.id
      JOIN books b ON br.book_id = b.id
      WHERE br.status = 'active' 
        AND br.due_date > NOW() 
        AND br.due_date <= DATE_ADD(NOW(), INTERVAL ? DAY)
      ORDER BY br.due_date ASC
    `;
    
    return await executeQuery(query, [days]);
  }
  
  // Statistiques des emprunts
  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_borrowings,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_borrowings,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_borrowings,
        COUNT(CASE WHEN status = 'active' AND due_date < NOW() THEN 1 END) as overdue_borrowings,
        AVG(CASE WHEN status = 'returned' THEN DATEDIFF(returned_at, borrowed_at) END) as avg_borrowing_duration
      FROM borrowings
    `;
    
    return await queryOne(query);
  }
  
  // Historique d'un livre
  static async getBookHistory(bookId, page = 1, limit = 10) {
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.max(1, Math.min(50, parseInt(limit) || 10));
    const offset = (validPage - 1) * validLimit;
    
    const query = `
      SELECT br.*, u.name as user_name
      FROM borrowings br
      JOIN users u ON br.user_id = u.id
      WHERE br.book_id = ?
      ORDER BY br.borrowed_at DESC
      LIMIT ${validLimit} OFFSET ${offset}
    `;
    
    const history = await executeQuery(query, [bookId]);
    
    const countQuery = 'SELECT COUNT(*) as total FROM borrowings WHERE book_id = ?';
    const [{ total }] = await executeQuery(countQuery, [bookId]);
    
    return {
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Récupérer un emprunt par son ID avec les détails du livre et de l'utilisateur
  static async findById(borrowingId) {
    const query = `
      SELECT br.*, 
             u.name as user_name, u.email as user_email,
             b.title as book_title, b.author as book_author, b.isbn, b.cover_image,
             CASE 
               WHEN br.status = 'active' AND br.due_date < NOW() THEN 'overdue'
               ELSE br.status 
             END as current_status,
             DATEDIFF(NOW(), br.due_date) as days_overdue
      FROM borrowings br
      JOIN users u ON br.user_id = u.id
      JOIN books b ON br.book_id = b.id
      WHERE br.id = ?
    `;
    
    const result = await executeQuery(query, [borrowingId]);
    return result.length > 0 ? result[0] : null;
  }
}

module.exports = Borrowing;
