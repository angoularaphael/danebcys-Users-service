require('dotenv').config();

const app = require('./src/app');
const { pool, initDB } = require('./src/config/database');
const { connectMongo } = require('./src/config/mongodb');
const env = require('./src/config/env');

async function start() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[Users Service] PostgreSQL connecté');

    await initDB();

    await connectMongo();

    app.listen(env.PORT, () => {
      console.log(`[Users Service] Démarré sur le port ${env.PORT}`);
    });
  } catch (err) {
    console.error('[Users Service] Erreur au démarrage:', err.message);
    process.exit(1);
  }
}

start();
