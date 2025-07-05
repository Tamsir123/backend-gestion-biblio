const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration de la connexion avec pool pour optimiser les performances
const dbConfig = {
  host:'127.0.0.1',
  user:'root',
  password:'Tam@1#',
  database:'bibliotheque_web',
  port:3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

// Création du pool de connexions
const pool = mysql.createPool(dbConfig);

// Fonction utilitaire pour exécuter des requêtes
const executeQuery = async (query, params = []) => {
  const [results] = await pool.execute(query, params);
  return results;
};

// Fonction pour obtenir une seule ligne
const queryOne = async (query, params = []) => {
  const results = await executeQuery(query, params);
  return results[0] || null;
};

// Fonction transactionnelle
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// Fonction de test de connexion
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    console.log('✅ Connexion réussie à MySQL');
    connection.release();
    return true;
  } catch (err) {
    console.error('❌ Erreur de connexion à MySQL:', err.message);
    return false;
  }
};

module.exports = {
  pool,
  executeQuery,
  queryOne,
  transaction,
  testConnection
};
