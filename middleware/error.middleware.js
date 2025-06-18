// === middleware/error.middleware.js ===

const errorHandler = (err, req, res, next) => {
  console.error('Erreur:', err.message);
  
  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Données invalides',
      details: err.message
    });
  }
  
  // Erreur de token JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token invalide'
    });
  }
  
  // Erreur de token expiré
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expiré'
    });
  }
  
  // Erreur MySQL
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(500).json({
      error: 'Erreur de base de données',
      details: err.message
    });
  }
  
  // Erreur générique du serveur
  res.status(500).json({
    error: 'Erreur interne du serveur',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
};

module.exports = errorHandler;
