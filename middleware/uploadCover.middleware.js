const multer = require('multer');
const path = require('path');

// Configuration du stockage des images de couverture
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/covers/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées.'), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
