const Book = require('../models/Book');
const { validationResult } = require('express-validator');

class BookController {
  // Obtenir tous les livres avec filtres et pagination
  static async getAll(req, res) {
    try {
      const { 
        search, 
        genre, 
        author, 
        available_only, 
        page = 1, 
        limit = 20 
      } = req.query;

      const filters = {
        search,
        genre,
        author,
        available_only: available_only === 'true'
      };

      const result = await Book.findAll(filters, parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des livres:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Obtenir un livre par ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      
      const book = await Book.findById(id);
      
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Livre non trouvé'
        });
      }

      res.json({
        success: true,
        data: book
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du livre:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Créer un nouveau livre (admin only)
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const bookData = req.body;

      // Si une image de couverture a été uploadée, ajouter le chemin au bookData
      if (req.file) {
        bookData.cover_image = `/uploads/covers/${req.file.filename}`;
      }
      const bookId = await Book.create(bookData);

      res.status(201).json({
        success: true,
        message: 'Livre créé avec succès',
        data: { bookId }
      });

    } catch (error) {
      console.error('Erreur lors de la création du livre:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'Un livre avec cet ISBN existe déjà'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Mettre à jour un livre (admin only)
  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      
      // Ne prendre que les champs qui sont fournis dans req.body
      const allowedFields = ['title', 'author', 'isbn', 'genre', 'description', 'total_quantity', 'publication_year'];
      const updateData = {};
      
      // Filtrer pour ne garder que les champs autorisés et non vides
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });
      
      // Vérifier qu'au moins un champ est fourni
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucun champ à mettre à jour fourni'
        });
      }

      const updated = await Book.update(id, updateData);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Livre non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Livre mis à jour avec succès',
        updatedFields: Object.keys(updateData)
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du livre:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'Un livre avec cet ISBN existe déjà'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Supprimer un livre (admin only)
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const deleted = await Book.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Livre non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Livre supprimé avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la suppression du livre:', error);
      
      if (error.message.includes('emprunts actifs')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Recherche avancée
  static async search(req, res) {
    try {
      const { q: searchTerm } = req.query;
      
      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          message: 'Terme de recherche requis'
        });
      }

      const results = await Book.search(searchTerm);

      res.json({
        success: true,
        data: results
      });

    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Obtenir les genres disponibles
  static async getGenres(req, res) {
    try {
      const genres = await Book.getGenres();

      res.json({
        success: true,
        data: genres
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des genres:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Obtenir les auteurs populaires
  static async getPopularAuthors(req, res) {
    try {
      const { limit = 10 } = req.query;
      const authors = await Book.getPopularAuthors(parseInt(limit));

      res.json({
        success: true,
        data: authors
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des auteurs populaires:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Vérifier la disponibilité d'un livre
  static async checkAvailability(req, res) {
    try {
      const { id } = req.params;
      
      const availability = await Book.checkAvailability(id);

      res.json({
        success: true,
        data: availability
      });

    } catch (error) {
      console.error('Erreur lors de la vérification de disponibilité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Statistiques des livres (admin only)
  static async getStats(req, res) {
    try {
      const stats = await Book.getStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }
}

module.exports = BookController;
