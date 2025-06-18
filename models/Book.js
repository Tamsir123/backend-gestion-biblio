const { executeQuery, queryOne } = require('../config/database');

class Book {
  // Créer un nouveau livre
  static async create(bookData) {
    const { title, author, isbn, genre, description, total_quantity, publication_year } = bookData;
    
    const query = `
      INSERT INTO books (title, author, isbn, genre, description, total_quantity, available_quantity, publication_year) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await executeQuery(query, [
      title, author, isbn, genre, description, 
      total_quantity, total_quantity, publication_year
    ]);
    
    return result.insertId;
  }
  
  // Obtenir tous les livres avec pagination et filtres
  static async findAll(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];
    
    // Construction dynamique des filtres
    if (filters.search) {
      whereConditions.push('(b.title LIKE ? OR b.author LIKE ? OR b.description LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (filters.genre) {
      whereConditions.push('b.genre = ?');
      params.push(filters.genre);
    }
    
    if (filters.author) {
      whereConditions.push('b.author LIKE ?');
      params.push(`%${filters.author}%`);
    }
    
    if (filters.available_only) {
      whereConditions.push('b.available_quantity > 0');
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    const query = `
      SELECT b.*, 
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(DISTINCT r.id) as review_count
      FROM books b
      LEFT JOIN reviews r ON b.id = r.book_id
      ${whereClause}
      GROUP BY b.id, b.title, b.author, b.isbn, b.genre, b.description, 
               b.total_quantity, b.available_quantity, b.publication_year, 
               b.created_at, b.updated_at
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    const books = await executeQuery(query, params);
    
    // Compter le total avec les mêmes filtres
    const countQuery = `
      SELECT COUNT(DISTINCT b.id) as total 
      FROM books b 
      ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Enlever limit et offset
    const countResult = await executeQuery(countQuery, countParams);
    const total = countResult[0]?.total || 0;
    
    return {
      books,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  // Obtenir un livre par ID avec détails complets
  static async findById(id) {
    const query = `
      SELECT b.*, 
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(r.id) as review_count,
             (SELECT COUNT(*) FROM borrowings WHERE book_id = b.id AND status = 'active') as currently_borrowed
      FROM books b
      LEFT JOIN reviews r ON b.id = r.book_id
      WHERE b.id = ?
      GROUP BY b.id
    `;
    
    return await queryOne(query, [id]);
  }
  
  // Mettre à jour un livre
  static async update(id, bookData) {
    // Construire la requête dynamiquement selon les champs fournis
    const fields = Object.keys(bookData);
    const values = Object.values(bookData);
    
    if (fields.length === 0) {
      throw new Error('Aucun champ à mettre à jour');
    }
    
    // Si on modifie la quantité totale, on doit ajuster la quantité disponible
    if (bookData.total_quantity !== undefined) {
      // Récupérer les quantités actuelles
      const currentBook = await queryOne('SELECT available_quantity, total_quantity FROM books WHERE id = ?', [id]);
      if (currentBook) {
        const difference = bookData.total_quantity - currentBook.total_quantity;
        const newAvailableQuantity = Math.max(0, currentBook.available_quantity + difference);
        
        // Ajouter available_quantity à la mise à jour si pas déjà présent
        if (!fields.includes('available_quantity')) {
          bookData.available_quantity = newAvailableQuantity;
        }
      }
    }
    
    // Reconstruire fields et values après modification potentielle
    const finalFields = Object.keys(bookData);
    const finalValues = Object.values(bookData);
    
    // Construire la partie SET de la requête
    const setClause = finalFields.map(field => `${field} = ?`).join(', ');
    
    const query = `
      UPDATE books 
      SET ${setClause}, updated_at = NOW()
      WHERE id = ?
    `;
    
    // Ajouter l'ID à la fin des paramètres
    finalValues.push(id);
    
    const result = await executeQuery(query, finalValues);
    return result.affectedRows > 0;
  }
  
  // Supprimer un livre
  static async delete(id) {
    // Vérifier s'il y a des emprunts actifs
    const activeLoans = await queryOne(
      'SELECT COUNT(*) as count FROM borrowings WHERE book_id = ? AND status = "active"', 
      [id]
    );
    
    if (activeLoans.count > 0) {
      throw new Error('Impossible de supprimer ce livre : des exemplaires sont actuellement empruntés');
    }
    
    const query = 'DELETE FROM books WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.affectedRows > 0;
  }
  
  // Obtenir les genres uniques
  static async getGenres() {
    const query = 'SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre';
    const result = await executeQuery(query);
    return result.map(row => row.genre);
  }
  
  // Obtenir les auteurs populaires
  static async getPopularAuthors(limit = 10) {
    const query = `
      SELECT author, COUNT(*) as book_count,
             (SELECT COUNT(*) FROM borrowings b WHERE b.book_id IN 
              (SELECT id FROM books WHERE author = books.author)) as total_borrowings
      FROM books 
      GROUP BY author 
      ORDER BY total_borrowings DESC, book_count DESC 
      LIMIT ?
    `;
    
    return await executeQuery(query, [limit]);
  }
  
  // Statistiques des livres
  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_books,
        SUM(total_quantity) as total_copies,
        SUM(available_quantity) as available_copies,
        COUNT(DISTINCT author) as unique_authors,
        COUNT(DISTINCT genre) as unique_genres,
        (SELECT COUNT(*) FROM borrowings WHERE status = 'active') as currently_borrowed
    `;
    
    return await queryOne(query);
  }
  
  // Recherche avancée
  static async search(searchTerm, filters = {}) {
    const query = `
      SELECT b.*, 
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(r.id) as review_count,
             MATCH(title, author, description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
      FROM books b
      LEFT JOIN reviews r ON b.id = r.book_id
      WHERE MATCH(title, author, description) AGAINST(? IN NATURAL LANGUAGE MODE)
         OR title LIKE ? OR author LIKE ? OR isbn LIKE ?
      GROUP BY b.id
      ORDER BY relevance DESC, average_rating DESC
      LIMIT 50
    `;
    
    const searchPattern = `%${searchTerm}%`;
    return await executeQuery(query, [
      searchTerm, searchTerm, searchPattern, searchPattern, searchPattern
    ]);
  }
  
  // Vérifier la disponibilité
  static async checkAvailability(bookId) {
    const query = 'SELECT available_quantity, total_quantity FROM books WHERE id = ?';
    const book = await queryOne(query, [bookId]);
    
    return {
      isAvailable: book && book.available_quantity > 0,
      availableQuantity: book ? book.available_quantity : 0,
      totalQuantity: book ? book.total_quantity : 0
    };
  }
}

module.exports = Book;
