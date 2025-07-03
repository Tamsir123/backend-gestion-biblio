const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');

// Configuration des domaines pour la détection automatique des rôles
const ROLE_DOMAINS = {
  admin: [
    '@bibliotheque.2ie.edu',
    '@admin.2ie.edu',
    '@staff.2ie.edu',
    '@direction.2ie.edu',
    '@biblio.com'
  ],
  student: [
    '@etu.2ie-edu.org',
    '@student.2ie.edu',
    '@2ie.edu',
    '@gmail.com', // Temporaire pour les tests
    '@yahoo.com',
    '@hotmail.com'
  ]
};

/**
 * Détecte automatiquement le rôle en fonction du domaine de l'email
 * @param {string} email - L'adresse email
 * @returns {string} - Le rôle détecté ('admin' ou 'student')
 */
function detectRoleFromEmail(email) {
  const emailLower = email.toLowerCase();
  
  // Vérifier les domaines admin en premier
  for (const domain of ROLE_DOMAINS.admin) {
    if (emailLower.includes(domain)) {
      return 'admin';
    }
  }
  
  // Vérifier les domaines étudiants
  for (const domain of ROLE_DOMAINS.student) {
    if (emailLower.includes(domain)) {
      return 'student';
    }
  }
  
  // Par défaut, retourner 'student' si aucun domaine n'est trouvé
  return 'student';
}

/**
 * Génère un token JWT
 * @param {object} user - Les données de l'utilisateur
 * @returns {string} - Le token JWT
 */
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

class AuthController {
  /**
   * Inscription d'un nouvel utilisateur
   */
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

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Un utilisateur avec cet email existe déjà'
        });
      }

      // Détection automatique du rôle basée sur le domaine email
      const detectedRole = detectRoleFromEmail(email);
      console.log(`🔍 Détection automatique du rôle pour ${email}: ${detectedRole}`);

      // Créer l'utilisateur avec le rôle détecté
      const userData = {
        name,
        email,
        password,
        role: detectedRole
      };

      const userId = await User.create(userData);

      // Générer le token
      const user = await User.findById(userId);
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        message: `Inscription réussie en tant que ${detectedRole}`,
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
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

  /**
   * Connexion d'un utilisateur
   */
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

      // Chercher l'utilisateur
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Vérifier si le compte est actif
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Votre compte a été désactivé. Contactez l\'administrateur.'
        });
      }

      // Vérifier le mot de passe
      const isPasswordValid = await User.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Détection et mise à jour automatique du rôle si nécessaire
      const detectedRole = detectRoleFromEmail(email);
      if (user.role !== detectedRole) {
        console.log(`🔄 Mise à jour automatique du rôle pour ${email}: ${user.role} → ${detectedRole}`);
        await User.update(user.id, { role: detectedRole });
        user.role = detectedRole;
      }

      // Enregistrer la connexion
      const loginData = {
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        device_type: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop'
      };
      await User.recordLogin(user.id, loginData);

      // Générer le token
      const token = generateToken(user);

      res.json({
        success: true,
        message: `Connexion réussie en tant que ${user.role}`,
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profile_image: user.profile_image,
            student_id: user.student_id,
            department: user.department,
            level: user.level
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

  /**
   * Obtenir les informations de l'utilisateur connecté
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile_image: user.profile_image,
          student_id: user.student_id,
          phone: user.phone,
          address: user.address,
          date_of_birth: user.date_of_birth,
          department: user.department,
          level: user.level,
          country: user.country,
          city: user.city,
          bio: user.bio,
          created_at: user.created_at
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

  /**
   * Changer le mot de passe
   */
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

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Récupérer l'utilisateur
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Vérifier le mot de passe actuel
      const isCurrentPasswordValid = await User.verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Mot de passe actuel incorrect'
        });
      }

      // Hasher le nouveau mot de passe
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Mettre à jour le mot de passe
      await User.update(userId, { password: hashedNewPassword });

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

  /**
   * Vérifier un token JWT
   */
  static async verifyToken(req, res) {
    try {
      // Si on arrive ici, c'est que le token est valide (grâce au middleware auth)
      res.json({
        success: true,
        message: 'Token valide',
        data: {
          user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
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

  /**
   * Déconnexion (côté client principalement)
   */
  static async logout(req, res) {
    try {
      // Pour l'instant, nous n'avons pas de blacklist de tokens
      // La déconnexion se fait côté client en supprimant le token
      res.json({
        success: true,
        message: 'Déconnexion réussie'
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Fonction utilitaire pour tester la détection de rôle
   */
  static testRoleDetection(req, res) {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis'
      });
    }

    const detectedRole = detectRoleFromEmail(email);
    
    res.json({
      success: true,
      data: {
        email,
        detectedRole,
        explanation: `Rôle détecté automatiquement basé sur le domaine de l'email`
      }
    });
  }
}

module.exports = AuthController;