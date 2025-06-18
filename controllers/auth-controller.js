// === controllers/auth-controller.js ===
const User = require('../models/user-model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Inscription
exports.register = async (req, res) => {
  try {
    const { nom, email, mot_de_passe, role } = req.body;
    
    // Vérifier si l'utilisateur existe déjà
    User.findByEmail(email, async (err, users) => {
      if (err) return res.status(500).json({ error: err.message });
      if (users.length > 0) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
      
      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
      
      // Créer l'utilisateur
      const userData = {
        nom,
        email,
        mot_de_passe: hashedPassword,
        role: role || 'user'
      };
      
      User.create(userData, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Utilisateur créé avec succès' });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Connexion
exports.login = (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;
    
    User.findByEmail(email, async (err, users) => {
      if (err) return res.status(500).json({ error: err.message });
      if (users.length === 0) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }
      
      const user = users[0];
      const isPasswordValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }
      
      // Générer le token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'votre_secret_jwt',
        { expiresIn: '24h' }
      );
      
      res.json({
        message: 'Connexion réussie',
        token,
        user: {
          id: user.id,
          nom: user.nom,
          email: user.email,
          role: user.role
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtenir le profil utilisateur
exports.getProfile = (req, res) => {
  User.findById(req.user.id, (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const user = users[0];
    res.json({
      id: user.id,
      nom: user.nom,
      email: user.email,
      role: user.role
    });
  });
};
