const mysql = require('mysql2');

const db = mysql.createConnection({
  host: '127.0.0.1',        // Adresse de l'hôte (votre machine locale)
  user: 'root',             // Utilisateur MySQL
  password: 'Tam@1#',       // Mot de passe défini dans le conteneur
  database: 'bibliotheque_web', // Nom de la base de données
  port: 4002,               // Port mappé sur l'hô
});

db.connect((err) => {
  if (err) {
    console.error('❌ Erreur de connexion à MySQL :', err.message);
  } else {
    console.log('✅ Connexion réussie à MySQL');
  }
});

module.exports = db;