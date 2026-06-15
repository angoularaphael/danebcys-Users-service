// Connexion PostgreSQL pour les données utilisateur (adresses, abonnements)
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const env = require('./env');

// Pool de connexions PostgreSQL partagé pour toutes les requêtes du service.
const pool = new Pool({
  host: env.PG_HOST,
  port: env.PG_PORT,
  database: env.PG_DATABASE,
  user: env.PG_USER,
  password: env.PG_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// Journalise les erreurs inattendues émises par le pool PostgreSQL.
pool.on('error', (err) => {
  console.error('[database] Erreur inattendue du pool:', err.message);
});

// Exécute une requête SQL paramétrée via le pool PostgreSQL.
// En développement, journalise la durée et le nombre de lignes retournées.
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (env.NODE_ENV === 'development') {
    const duration = Date.now() - start;
    console.log('[query]', { text: text.substring(0, 80), duration: `${duration}ms`, rows: result.rowCount });
  }
  return result;
}

// Obtient un client PostgreSQL dédié du pool (pour transactions multi-requêtes).
async function getClient() {
  return pool.connect();
}

// Initialise le schéma PostgreSQL en exécutant le script init.sql au démarrage.
async function initDB() {
  const sqlPath = path.join(__dirname, '..', '..', 'init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('[database] Schema initialisé avec succès');
  } catch (err) {
    console.error('[database] Erreur initialisation:', err.message);
    throw err;
  }
}

module.exports = { pool, query, getClient, initDB };
