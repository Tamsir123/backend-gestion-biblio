const mysql = require('mysql2');
require('dotenv').config();

// Configuration de la connexion avec pool pour optimiser les performances
const dbConfig = {
  host:'127.0.0.1',
  user:'root',
  password:'Tam@1#',
  database:'bibliotheque_web',
  port:4002,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

// Création de la connexion
const db = mysql.createConnection(dbConfig);

// Test de connexion
const testConnection = async () => {
  return new Promise((resolve, reject) => {
    db.connect((err) => {
      if (err) {
        console.error('❌ Erreur de connexion à MySQL:', err.message);
        resolve(false);
      } else {
        console.log('✅ Connexion réussie à MySQL');
        console.log(`📍 Base de données: ${dbConfig.database}`);
        console.log(`🔗 Host: ${dbConfig.host}:${dbConfig.port}`);
        resolve(true);
      }
    });
  });
};

// Fonction utilitaire pour exécuter des requêtes
const executeQuery = async (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(query, params, (error, results) => {
      if (error) {
        console.error('❌ Erreur lors de l\'exécution de la requête:', error.message);
        console.error('🔍 Requête:', query);
        console.error('📝 Paramètres:', params);
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};

// Fonction pour obtenir une seule ligne
const queryOne = async (query, params = []) => {
  const results = await executeQuery(query, params);
  return results[0] || null;
};

module.exports = {
  db,
  executeQuery,
  queryOne,
  testConnection
};
