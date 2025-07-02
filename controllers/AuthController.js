const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

class AuthController {
  // Inscription
  static async register(req, res) {
    try {
      // Vérifier les erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { name, email, password } = req.body;
      let { role } = req.body;

      // Déterminer le rôle automatiquement si non fourni
      if (!role) {
        if (email.endsWith('@admin.2ie.edu.com') ){
          role = 'admin';
        } else if (email.endsWith('@2ie.edu.com') || email.endsWith('@gmail.com')) {
          role = 'student';
        } else {
          role = 'student'; // Par défaut
        }
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }

      // Créer l'utilisateur
      const userId = await User.create({ name, email, password, role });

      res.status(201).json({
        success: true,
        message: 'Utilisateur créé avec succès',
        data: {
          userId,
          name,
          email,
          role
        }
      });

    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Connexion
  static async login(req, res) {
    try {
      // Vérifier les erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Trouver l'utilisateur
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Déterminer le rôle automatiquement si non défini
      let role = user.role;
      if (!role) {
        if (email.endsWith('@admin.2ie.edu') || email === 'admin@biblio.com') {
          role = 'admin';
        } else if (email.endsWith('@2ie.edu') || email.endsWith('@student.2ie.edu')) {
          role = 'student';
        } else {
          role = 'student'; // Par défaut
        }
        // Mettre à jour le rôle dans la base si besoin
        await User.update(user.id, { role });
      }

      // Vérifier le mot de passe
      const isPasswordValid = await User.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Générer le token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: role
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Obtenir le profil utilisateur
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Obtenir les statistiques de l'utilisateur
      const stats = await User.getStats(req.user.userId);

      res.json({
        success: true,
        data: {
          user,
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

  // Mettre à jour le profil
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

      const { name, email } = req.body;
      const userId = req.user.userId;

      // Vérifier si le nouvel email n'est pas déjà utilisé
      if (email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({
            success: false,
            message: 'Cet email est déjà utilisé'
          });
        }
      }

      // Mettre à jour l'utilisateur
      const updated = await User.update(userId, { name, email });
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Profil mis à jour avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Vérifier la validité du token
  static async verifyToken(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Déconnexion (côté client principalement)
  static async logout(req, res) {
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  }
}

module.exports = AuthController;
