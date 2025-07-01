const User = require('../models/User');

class UserController {
  // Lister tous les utilisateurs (admin)
  static async getAll(req, res) {
    try {
      const users = await User.findAll();
      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
    }
  }
}

module.exports = UserController;
