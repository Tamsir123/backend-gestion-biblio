const { executeQuery, queryOne } = require('../config/database');

class Book {
  // Créer un nouveau livre
  static async create(bookData) {
    try {
      const { title, author, isbn, genre, description, total_quantity, publication_year, cover_image } = bookData;
      
      // Validation des données requises
      if (!title || !author) {
        throw new Error('Le titre et l\'auteur sont requis');
      }
      
      const totalQty = parseInt(total_quantity) || 1;
      
      const query = `
        INSERT INTO books (
          title, author, isbn, genre, description, 
          total_quantity, available_quantity, publication_year, cover_image
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await executeQuery(query, [
        title, 
        author, 
        isbn || null, 
        genre || null, 
        description || null, 
        totalQty, 
        totalQty, // available_quantity = total_quantity initialement
        publication_year || null,
        cover_image || null
      ]);
      
      return result.insertId;
    } catch (error) {
      console.error('Erreur lors de la création du livre:', error);
      throw error;
    }
  }
  
  // Obtenir tous les livres avec pagination et filtres
  static async findAll(filters = {}, page = 1, limit = 20) {
    try {
      // Validation et nettoyage des paramètres
      const validPage = Math.max(1, parseInt(page) || 1);
      const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 20));
      const offset = (validPage - 1) * validLimit;
      
      let whereConditions = [];
      let params = [];
      
      // Construction dynamique des filtres
      if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
        whereConditions.push('(b.title LIKE ? OR b.author LIKE ? OR b.description LIKE ?)');
        const searchTerm = `%${filters.search.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      if (filters.genre && typeof filters.genre === 'string' && filters.genre.trim()) {
        whereConditions.push('b.genre = ?');
        params.push(filters.genre.trim());
      }
      
      if (filters.author && typeof filters.author === 'string' && filters.author.trim()) {
        whereConditions.push('b.author LIKE ?');
        params.push(`%${filters.author.trim()}%`);
      }
      
      if (filters.available_only === true || filters.available_only === 'true') {
        whereConditions.push('b.available_quantity > 0');
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      // Requête principale pour récupérer les livres
      const query = `
        SELECT 
          b.id,
          b.title,
          b.author,
          b.isbn,
          b.genre,
          b.description,
          b.cover_image,
          b.total_quantity,
          b.available_quantity,
          b.publication_year,
          b.created_at,
          b.updated_at,
          COALESCE(AVG(r.rating), 0) as average_rating,
          COUNT(DISTINCT r.id) as review_count
        FROM books b
        LEFT JOIN reviews r ON b.id = r.book_id
        ${whereClause}
        GROUP BY 
          b.id, b.title, b.author, b.isbn, b.genre, b.description, 
          b.cover_image, b.total_quantity, b.available_quantity, 
          b.publication_year, b.created_at, b.updated_at
        ORDER BY b.created_at DESC
        LIMIT ${validLimit} OFFSET ${offset}
      `;
      
      const books = await executeQuery(query, params);
      
      // Requête pour compter le total (sans LIMIT/OFFSET)
      const countQuery = `
        SELECT COUNT(DISTINCT b.id) as total 
        FROM books b 
        ${whereClause}
      `;
      
      const countResult = await executeQuery(countQuery, params);
      const total = countResult[0]?.total || 0;
      
      return {
        books,
        pagination: {
          page: validPage,
          limit: validLimit,
          total: parseInt(total),
          totalPages: Math.ceil(total / validLimit)
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des livres:', error);
      throw error;
    }
  }
  
  // Obtenir un livre par ID avec détails complets
  static async findById(id) {
    try {
      const bookId = parseInt(id);
      if (!bookId || isNaN(bookId)) {
        throw new Error('ID de livre invalide');
      }
      
      const query = `
        SELECT 
          b.*,
          COALESCE(AVG(r.rating), 0) as average_rating,
          COUNT(DISTINCT r.id) as review_count,
          (SELECT COUNT(*) FROM borrowings 
           WHERE book_id = b.id AND status = 'active') as currently_borrowed
        FROM books b
        LEFT JOIN reviews r ON b.id = r.book_id
        WHERE b.id = ?
        GROUP BY b.id
      `;
      
      return await queryOne(query, [bookId]);
    } catch (error) {
      console.error('Erreur lors de la récupération du livre:', error);
      throw error;
    }
  }
  
  // Mettre à jour un livre
  static async update(id, bookData) {
    try {
      const bookId = parseInt(id);
      if (!bookId || isNaN(bookId)) {
        throw new Error('ID de livre invalide');
      }
      
      // Filtrer les champs valides et non vides
      const allowedFields = [
        'title', 'author', 'isbn', 'genre', 'description', 
        'total_quantity', 'available_quantity', 'publication_year', 'cover_image'
      ];
      
      const updateData = {};
      Object.keys(bookData).forEach(key => {
        if (allowedFields.includes(key) && bookData[key] !== undefined && bookData[key] !== null) {
          updateData[key] = bookData[key];
        }
      });
      
      if (Object.keys(updateData).length === 0) {
        throw new Error('Aucun champ valide à mettre à jour');
      }
      
      // Gestion spéciale pour total_quantity
      if (updateData.total_quantity !== undefined) {
        const newTotalQty = parseInt(updateData.total_quantity);
        if (isNaN(newTotalQty) || newTotalQty < 0) {
          throw new Error('Quantité totale invalide');
        }
        
        // Récupérer les quantités actuelles
        const currentBook = await queryOne(
          'SELECT available_quantity, total_quantity FROM books WHERE id = ?', 
          [bookId]
        );
        
        if (currentBook) {
          const difference = newTotalQty - currentBook.total_quantity;
          const newAvailableQty = Math.max(0, currentBook.available_quantity + difference);
          
          // Mettre à jour available_quantity si pas déjà spécifié
          if (updateData.available_quantity === undefined) {
            updateData.available_quantity = newAvailableQty;
          }
        }
        
        updateData.total_quantity = newTotalQty;
      }
      
      // Validation pour available_quantity
      if (updateData.available_quantity !== undefined) {
        const newAvailableQty = parseInt(updateData.available_quantity);
        if (isNaN(newAvailableQty) || newAvailableQty < 0) {
          throw new Error('Quantité disponible invalide');
        }
        updateData.available_quantity = newAvailableQty;
      }
      
      // Construire la requête UPDATE
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      const query = `
        UPDATE books 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      values.push(bookId);
      const result = await executeQuery(query, values);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du livre:', error);
      throw error;
    }
  }
  
  // Supprimer un livre
  static async delete(id) {
    try {
      const bookId = parseInt(id);
      if (!bookId || isNaN(bookId)) {
        throw new Error('ID de livre invalide');
      }
      
      // Vérifier s'il y a des emprunts actifs
      const activeLoans = await queryOne(
        'SELECT COUNT(*) as count FROM borrowings WHERE book_id = ? AND status = ?', 
        [bookId, 'active']
      );
      
      if (activeLoans && activeLoans.count > 0) {
        throw new Error('Impossible de supprimer ce livre : des exemplaires sont actuellement empruntés');
      }
      
      const query = 'DELETE FROM books WHERE id = ?';
      const result = await executeQuery(query, [bookId]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erreur lors de la suppression du livre:', error);
      throw error;
    }
  }
  
  // Obtenir les genres uniques
  static async getGenres() {
    try {
      const query = `
        SELECT DISTINCT genre 
        FROM books 
        WHERE genre IS NOT NULL AND genre != '' 
        ORDER BY genre ASC
      `;
      
      const result = await executeQuery(query);
      return result.map(row => row.genre);
    } catch (error) {
      console.error('Erreur lors de la récupération des genres:', error);
      throw error;
    }
  }
  
  // Obtenir les auteurs populaires
  static async getPopularAuthors(limit = 10) {
    try {
      const validLimit = Math.max(1, Math.min(50, parseInt(limit) || 10));
      
      const query = `
        SELECT 
          b.author,
          COUNT(DISTINCT b.id) as book_count,
          COALESCE(
            (SELECT COUNT(*) 
             FROM borrowings br 
             JOIN books b2 ON br.book_id = b2.id 
             WHERE b2.author = b.author), 
            0
          ) as total_borrowings
        FROM books b
        WHERE b.author IS NOT NULL AND b.author != ''
        GROUP BY b.author 
        ORDER BY total_borrowings DESC, book_count DESC 
        LIMIT ${validLimit}
      `;
      
      return await executeQuery(query);
    } catch (error) {
      console.error('Erreur lors de la récupération des auteurs populaires:', error);
      throw error;
    }
  }
  
  // Statistiques des livres
  static async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_books,
          COALESCE(SUM(total_quantity), 0) as total_copies,
          COALESCE(SUM(available_quantity), 0) as available_copies,
          COUNT(DISTINCT author) as unique_authors,
          COUNT(DISTINCT genre) as unique_genres,
          COALESCE(
            (SELECT COUNT(*) FROM borrowings WHERE status = 'active'), 
            0
          ) as currently_borrowed
        FROM books
      `;
      
      return await queryOne(query);
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
  
  // Recherche avancée
  static async search(searchTerm, filters = {}) {
    try {
      if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
        throw new Error('Terme de recherche requis');
      }
      
      const cleanSearchTerm = searchTerm.trim();
      const searchPattern = `%${cleanSearchTerm}%`;
      
      const query = `
        SELECT 
          b.*,
          COALESCE(AVG(r.rating), 0) as average_rating,
          COUNT(DISTINCT r.id) as review_count
        FROM books b
        LEFT JOIN reviews r ON b.id = r.book_id
        WHERE 
          b.title LIKE ? OR 
          b.author LIKE ? OR 
          b.description LIKE ? OR
          b.isbn LIKE ?
        GROUP BY b.id
        ORDER BY 
          CASE 
            WHEN b.title LIKE ? THEN 1
            WHEN b.author LIKE ? THEN 2
            WHEN b.isbn LIKE ? THEN 3
            ELSE 4
          END,
          average_rating DESC
        LIMIT 50
      `;
      
      return await executeQuery(query, [
        searchPattern, searchPattern, searchPattern, searchPattern,
        searchPattern, searchPattern, searchPattern
      ]);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      throw error;
    }
  }
  
  // Vérifier la disponibilité
  static async checkAvailability(bookId) {
    try {
      const id = parseInt(bookId);
      if (!id || isNaN(id)) {
        throw new Error('ID de livre invalide');
      }
      
      const query = 'SELECT available_quantity, total_quantity FROM books WHERE id = ?';
      const book = await queryOne(query, [id]);
      
      if (!book) {
        return {
          isAvailable: false,
          availableQuantity: 0,
          totalQuantity: 0,
          exists: false
        };
      }
      
      return {
        isAvailable: book.available_quantity > 0,
        availableQuantity: parseInt(book.available_quantity) || 0,
        totalQuantity: parseInt(book.total_quantity) || 0,
        exists: true
      };
    } catch (error) {
      console.error('Erreur lors de la vérification de disponibilité:', error);
      throw error;
    }
  }
  
  // Mise à jour de la quantité disponible (pour les emprunts/retours)
  static async updateAvailableQuantity(bookId, change) {
    try {
      const id = parseInt(bookId);
      const changeValue = parseInt(change);
      
      if (!id || isNaN(id) || isNaN(changeValue)) {
        throw new Error('Paramètres invalides');
      }
      
      const query = `
        UPDATE books 
        SET available_quantity = GREATEST(0, available_quantity + ?)
        WHERE id = ? AND (available_quantity + ?) >= 0
      `;
      
      const result = await executeQuery(query, [changeValue, id, changeValue]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la quantité:', error);
      throw error;
    }
  }
}

module.exports = Book;
