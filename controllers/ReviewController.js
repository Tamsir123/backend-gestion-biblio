const Review = require('../models/Review');
const { validationResult } = require('express-validator');

class ReviewController {
  // Créer un nouvel avis
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

      const { book_id, rating, comment } = req.body;
      const user_id = req.user.userId;

      const reviewId = await Review.create({
        user_id,
        book_id,
        rating,
        comment
      });

      res.status(201).json({
        success: true,
        message: 'Avis ajouté avec succès',
        data: { reviewId }
      });

    } catch (error) {
      console.error('Erreur lors de la création de l\'avis:', error);
      
      if (error.message.includes('déjà donné un avis')) {
        return res.status(409).json({
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

  // Obtenir les avis d'un livre
  static async getBookReviews(req, res) {
    try {
      console.log('=== getBookReviews ===');
      const { id } = req.params;
      console.log('Book ID:', id);
      const { page = 1, limit = 20 } = req.query; // Augmenter la limite par défaut
      console.log('Page:', page, 'Limit:', limit);

      const result = await Review.findByBookId(id, parseInt(page), parseInt(limit));
      console.log('Résultat depuis le modèle:', result);

      res.json({
        success: true,
        reviews: result.reviews, // Le frontend s'attend à 'reviews' directement
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des avis:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Obtenir les statistiques d'un livre
  static async getBookStats(req, res) {
    try {
      const { id } = req.params;
      const stats = await Review.getBookStats(id);

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

  // Obtenir mes avis
  static async getMyReviews(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const userId = req.user.userId;

      const result = await Review.findByUserId(userId, parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des avis:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Mettre à jour un avis
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
      const { rating, comment } = req.body;
      const userId = req.user.userId;

      const updated = await Review.update(id, userId, { rating, comment });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Avis non trouvé ou non autorisé'
        });
      }

      res.json({
        success: true,
        message: 'Avis mis à jour avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'avis:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Supprimer un avis
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const deleted = await Review.delete(id, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Avis non trouvé ou non autorisé'
        });
      }

      res.json({
        success: true,
        message: 'Avis supprimé avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la suppression de l\'avis:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Modérer un avis (admin)
  static async moderate(req, res) {
    try {
      const { id } = req.params;
      const { is_approved } = req.body;

      const moderated = await Review.moderate(id, is_approved);

      if (!moderated) {
        return res.status(404).json({
          success: false,
          message: 'Avis non trouvé'
        });
      }

      res.json({
        success: true,
        message: `Avis ${is_approved ? 'approuvé' : 'rejeté'} avec succès`
      });

    } catch (error) {
      console.error('Erreur lors de la modération:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Obtenir les avis en attente (admin)
  static async getPendingReviews(req, res) {
    try {
      const reviews = await Review.getPendingReviews();

      res.json({
        success: true,
        data: reviews
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des avis en attente:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }
}

module.exports = ReviewController;
