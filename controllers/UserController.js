const User = require('../models/User');
const Borrowing = require('../models/Borrowing');
const { executeQuery, queryOne } = require('../config/database');
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

  // Obtenir le profil de l'utilisateur connecté
  static async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Obtenir les statistiques du profil
      const stats = await User.getProfileStats(userId);

      // Retirer les informations sensibles
      const { password, ...userProfile } = user;

      res.json({
        success: true,
        data: {
          profile: userProfile,
          stats
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Mettre à jour le profil de l'utilisateur connecté
  static async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const userId = req.user.userId;
      const profileData = req.body;

      // Séparer les données du profil et les préférences
      const { 
        notification_email, notification_sms, language, theme, 
        privacy_profile, receive_recommendations, ...userProfileData 
      } = profileData;

      // Mettre à jour le profil utilisateur
      if (Object.keys(userProfileData).length > 0) {
        const profileUpdated = await User.updateProfile(userId, userProfileData);
        if (!profileUpdated) {
          return res.status(400).json({
            success: false,
            message: 'Aucune modification apportée au profil'
          });
        }
      }

      // Mettre à jour les préférences si présentes
      const preferences = {
        notification_email, notification_sms, language, theme,
        privacy_profile, receive_recommendations
      };
      
      const hasPreferences = Object.values(preferences).some(val => val !== undefined);
      if (hasPreferences) {
        await User.updatePreferences(userId, preferences);
      }

      res.json({
        success: true,
        message: 'Profil mis à jour avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur interne du serveur'
      });
    }
  }

  // Changer le mot de passe
  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      // Récupérer l'utilisateur avec le mot de passe
      const user = await User.findByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Vérifier l'ancien mot de passe
      const isValidPassword = await User.verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mot de passe actuel incorrect'
        });
      }

      // Hasher le nouveau mot de passe
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Mettre à jour le mot de passe
      const query = 'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      await executeQuery(query, [hashedNewPassword, userId]);

      res.json({
        success: true,
        message: 'Mot de passe modifié avec succès'
      });

    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Supprimer le compte utilisateur
  static async deleteAccount(req, res) {
    try {
      const userId = req.user.userId;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Mot de passe requis pour supprimer le compte'
        });
      }

      // Vérifier le mot de passe
      const user = await User.findByEmail(req.user.email);
      const isValidPassword = await User.verifyPassword(password, user.password);
      
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mot de passe incorrect'
        });
      }

      // Vérifier s'il y a des emprunts actifs
      const activeLoans = await queryOne(
        'SELECT COUNT(*) as count FROM borrowings WHERE user_id = ? AND status = ?',
        [userId, 'active']
      );

      if (activeLoans && activeLoans.count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de supprimer le compte : vous avez des emprunts actifs'
        });
      }

      // Désactiver le compte au lieu de le supprimer
      await executeQuery(
        'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );

      res.json({
        success: true,
        message: 'Compte supprimé avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la suppression du compte:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Télécharger une image de profil
  static async uploadProfileImage(req, res) {
    try {
      const userId = req.user.userId;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }

      // Construire le chemin de l'image
      const imagePath = `/uploads/profiles/${req.file.filename}`;

      // Mettre à jour le profil utilisateur avec l'image
      const updated = await User.updateProfile(userId, {
        profile_image: imagePath
      });

      if (updated) {
        res.json({
          success: true,
          message: 'Image de profil mise à jour avec succès',
          data: { profile_image: imagePath }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la mise à jour de l\'image'
        });
      }

    } catch (error) {
      console.error('Erreur lors de l\'upload de l\'image:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }
}

module.exports = UserController;
