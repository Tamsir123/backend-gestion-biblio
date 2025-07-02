const Borrowing = require('../models/Borrowing');
const Book = require('../models/Book');
const Notification = require('../models/Notification');
const EmailService = require('../services/EmailService');
const { validationResult } = require('express-validator');

class BorrowingController {
  // Créer un nouvel emprunt
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

      const { book_id, due_date, notes } = req.body;
      const user_id = req.user.userId;

      // Vérifier la disponibilité du livre
      const availability = await Book.checkAvailability(book_id);
      if (!availability.isAvailable) {
        return res.status(400).json({
          success: false,
          message: 'Ce livre n\'est pas disponible pour l\'emprunt'
        });
      }

      const borrowingId = await Borrowing.create({
        user_id,
        book_id,
        due_date,
        notes
      });

      // Récupérer les détails du livre et de l'utilisateur pour l'email
      try {
        const borrowingDetails = await Borrowing.findById(borrowingId);
        if (borrowingDetails && borrowingDetails.user_email) {
          // Créer une notification de confirmation
          await Notification.create({
            user_id: user_id,
            type: 'general',
            title: `✅ Emprunt confirmé: ${borrowingDetails.book_title}`,
            message: `Votre emprunt du livre "${borrowingDetails.book_title}" a été confirmé. Date de retour : ${new Date(due_date).toLocaleDateString('fr-FR')}.`,
            expires_at: new Date(due_date)
          });

          // Envoyer l'email de confirmation
          await EmailService.sendBorrowingConfirmation(
            borrowingDetails.user_email,
            borrowingDetails.user_name || 'Utilisateur',
            borrowingDetails.book_title,
            borrowingDetails.book_author || '',
            due_date
          );
          
          console.log(`✅ Email de confirmation d'emprunt envoyé à ${borrowingDetails.user_email}`);
        }
      } catch (emailError) {
        console.log('⚠️ Erreur lors de l\'envoi de l\'email de confirmation:', emailError.message);
        // Ne pas faire échouer l'emprunt si l'email ne peut pas être envoyé
      }

      res.status(201).json({
        success: true,
        message: 'Emprunt créé avec succès',
        data: { borrowingId }
      });

    } catch (error) {
      console.error('Erreur lors de la création de l\'emprunt:', error);
      
      if (error.message.includes('déjà emprunté')) {
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

  // Obtenir les emprunts de l'utilisateur connecté
  static async getMyBorrowings(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const userId = req.user.userId;

      const result = await Borrowing.findByUserId(
        userId, 
        status, 
        parseInt(page), 
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des emprunts:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Obtenir tous les emprunts (admin only)
  static async getAll(req, res) {
    try {
      const { 
        status, 
        user_id, 
        book_id, 
        overdue_only, 
        page = 1, 
        limit = 20 
      } = req.query;

      const filters = {
        status,
        user_id,
        book_id,
        overdue_only: overdue_only === 'true'
      };

      const result = await Borrowing.findAll(filters, parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des emprunts:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Retourner un livre
  static async returnBook(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user.userId;

      // Si ce n'est pas un admin, vérifier que l'emprunt appartient à l'utilisateur
      if (req.user.role !== 'admin') {
        const borrowing = await Borrowing.findByUserId(userId);
        const userBorrowing = borrowing.borrowings.find(b => b.id === parseInt(id));
        
        if (!userBorrowing) {
          return res.status(403).json({
            success: false,
            message: 'Accès refusé'
          });
        }
      }

      const returned = await Borrowing.returnBook(id, notes);
      
      if (!returned) {
        return res.status(404).json({
          success: false,
          message: 'Emprunt non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Livre retourné avec succès'
      });

    } catch (error) {
      console.error('Erreur lors du retour du livre:', error);
      
      if (error.message.includes('déjà été retourné')) {
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

  // Renouveler un emprunt
  static async renew(req, res) {
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
      const { new_due_date } = req.body;
      const userId = req.user.userId;

      // Si ce n'est pas un admin, vérifier que l'emprunt appartient à l'utilisateur
      if (req.user.role !== 'admin') {
        const borrowing = await Borrowing.findByUserId(userId);
        const userBorrowing = borrowing.borrowings.find(b => b.id === parseInt(id));
        
        if (!userBorrowing) {
          return res.status(403).json({
            success: false,
            message: 'Accès refusé'
          });
        }
      }

      await Borrowing.renew(id, new_due_date);

      res.json({
        success: true,
        message: 'Emprunt renouvelé avec succès'
      });

    } catch (error) {
      console.error('Erreur lors du renouvellement:', error);
      
      if (error.message.includes('Impossible de renouveler')) {
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

  // Obtenir les emprunts en retard (admin only)
  static async getOverdue(req, res) {
    try {
      const overdueBooks = await Borrowing.getOverdue();

      res.json({
        success: true,
        data: overdueBooks
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des retards:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Obtenir les emprunts qui arrivent à échéance (admin only)
  static async getDueSoon(req, res) {
    try {
      const { days = 3 } = req.query;
      const dueSoonBooks = await Borrowing.getDueSoon(parseInt(days));

      res.json({
        success: true,
        data: dueSoonBooks
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des échéances:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Statistiques des emprunts (admin only)
  static async getStats(req, res) {
    try {
      const stats = await Borrowing.getStats();

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

  // Historique des emprunts d'un livre (admin only)
  static async getBookHistory(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const result = await Borrowing.getBookHistory(
        id, 
        parseInt(page), 
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }
}

module.exports = BorrowingController;
