const adminMiddleware = (req, res, next) => {
  try {
    // Vérifier si l'utilisateur est authentifié
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentification requise' 
      });
    }

    // Vérifier si l'utilisateur a le rôle admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Accès refusé. Droits administrateur requis.' 
      });
    }

    next();
  } catch (error) {
    console.error('Erreur dans le middleware admin:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erreur interne du serveur' 
    });
  }
};

module.exports = adminMiddleware;
