const { body, param, query } = require('express-validator');

// Validations pour l'authentification
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
  
  body('role')
    .optional()
    .isIn(['student', 'admin'])
    .withMessage('Le rôle doit être student ou admin')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis')
];

const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide')
];

// Validations pour les livres
const validateCreateBook = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Le titre est requis et doit contenir maximum 200 caractères'),
  
  body('author')
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('L\'auteur est requis et doit contenir maximum 150 caractères'),
  
  body('isbn')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('L\'ISBN doit contenir maximum 20 caractères'),
  
  body('genre')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Le genre doit contenir maximum 50 caractères'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('La description doit contenir maximum 5000 caractères'),
  
  body('total_quantity')
    .isInt({ min: 0, max: 1000 })
    .withMessage('La quantité totale doit être un nombre entier entre 0 et 1000'),
  
  body('publication_year')
    .exists()
    .isInt({ min: 1901, max: 2155 })
    .withMessage("L'année de publication doit être une année sur 4 chiffres entre 1901 et 2155")
];

const validateUpdateBook = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de livre invalide'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Le titre doit contenir entre 1 et 200 caractères'),
  
  body('author')
    .optional()
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('L\'auteur doit contenir entre 1 et 150 caractères'),
  
  body('isbn')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('L\'ISBN doit contenir maximum 20 caractères'),
  
  body('genre')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Le genre doit contenir maximum 50 caractères'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('La description doit contenir maximum 5000 caractères'),
  
  body('total_quantity')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('La quantité totale doit être un nombre entier entre 0 et 1000'),
  
  body('publication_year')
    .exists()
    .isInt({ min: 1901, max: 2155 })
    .withMessage("L'année de publication doit être une année sur 4 chiffres entre 1901 et 2155")
];

// Validations pour les emprunts
const validateCreateBorrowing = [
  body('book_id')
    .isInt({ min: 1 })
    .withMessage('ID de livre invalide'),
  
  body('due_date')
    .isISO8601()
    .custom((value) => {
      const dueDate = new Date(value);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 30); // Maximum 30 jours
      
      if (dueDate <= today) {
        throw new Error('La date d\'échéance doit être dans le futur');
      }
      
      if (dueDate > maxDate) {
        throw new Error('La date d\'échéance ne peut pas dépasser 30 jours');
      }
      
      return true;
    }),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Les notes doivent contenir maximum 500 caractères')
];

const validateRenewBorrowing = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID d\'emprunt invalide'),
  
  body('new_due_date')
    .isISO8601()
    .custom((value) => {
      const newDueDate = new Date(value);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 30);
      
      if (newDueDate <= today) {
        throw new Error('La nouvelle date d\'échéance doit être dans le futur');
      }
      
      if (newDueDate > maxDate) {
        throw new Error('La nouvelle date d\'échéance ne peut pas dépasser 30 jours');
      }
      
      return true;
    })
];

// Validations pour les paramètres communs
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID invalide')
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Le numéro de page doit être un entier positif'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être un entier entre 1 et 100')
];

module.exports = {
  // Authentification
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  
  // Livres
  validateCreateBook,
  validateUpdateBook,
  
  // Emprunts
  validateCreateBorrowing,
  validateRenewBorrowing,
  
  // Commun
  validateId,
  validatePagination
};
