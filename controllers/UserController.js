const User = require('../models/User');
const Borrowing = require('../models/Borrowing');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

class UserController {
  // Lister tous les utilisateurs (admin)
  static async getAll(req, res) {
    try {
      const users = await User.findAll();
      res.json({ success: true, data: { users } });
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
    }
  }

  // Créer un nouvel utilisateur (admin)
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

      const { name, email, password, role = 'student' } = req.body;

      // Vérifier si l'email existe déjà
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Un utilisateur avec cet email existe déjà'
        });
      }

      const userId = await User.create({ name, email, password, role });

      res.status(201).json({
        success: true,
        message: 'Utilisateur créé avec succès',
        data: { userId }
      });

    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Mettre à jour un utilisateur (admin)
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
      const { name, email, role, is_active } = req.body;

      // Vérifier si l'utilisateur existe
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Vérifier si l'email est déjà utilisé par un autre utilisateur
      if (email !== user.email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== parseInt(id)) {
          return res.status(400).json({
            success: false,
            message: 'Cet email est déjà utilisé par un autre utilisateur'
          });
        }
      }

      const updated = await User.update(id, { name, email, role, is_active });

      if (updated) {
        res.json({
          success: true,
          message: 'Utilisateur mis à jour avec succès'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Impossible de mettre à jour l\'utilisateur'
        });
      }

    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Supprimer un utilisateur (admin)
  static async delete(req, res) {
    try {
      const { id } = req.params;

      // Vérifier si l'utilisateur existe
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Empêcher la suppression de son propre compte
      if (parseInt(id) === req.user.userId) {
        return res.status(400).json({
          success: false,
          message: 'Vous ne pouvez pas supprimer votre propre compte'
        });
      }

      const deleted = await User.softDelete(id);

      if (deleted) {
        res.json({
          success: true,
          message: 'Utilisateur supprimé avec succès'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Impossible de supprimer l\'utilisateur'
        });
      }

    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Obtenir l'historique des emprunts d'un utilisateur (admin)
  static async getBorrowingHistory(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // Vérifier si l'utilisateur existe
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      const result = await Borrowing.findByUserId(id, null, parseInt(page), parseInt(limit));

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

  // Obtenir les statistiques d'un utilisateur (admin)
  static async getUserStats(req, res) {
    try {
      const { id } = req.params;

      // Vérifier si l'utilisateur existe
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      const stats = await User.getStats(id);

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

module.exports = UserController;
