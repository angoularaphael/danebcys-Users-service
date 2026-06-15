// Connexion MongoDB pour favoris et données document
const { MongoClient } = require('mongodb');
const env = require('./env');

// Client MongoDB singleton ; null tant que connectMongo() n'a pas été appelé.
let client = null;
// Référence à la base MongoDB active ; null tant que non connectée.
let db = null;

// Établit la connexion MongoDB (idempotent) et crée les index nécessaires.
async function connectMongo() {
  if (db) return db;

  client = new MongoClient(env.MONGO_URI, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000
  });

  await client.connect();
  db = client.db(env.MONGO_DB_NAME);

  await ensureIndexes();

  console.log('[mongodb] Connecté à', env.MONGO_DB_NAME);
  return db;
}

// Crée les index sur les collections favorites et subscriptions.
// Appelé automatiquement lors de la première connexion.
async function ensureIndexes() {
  const favoritesCol = db.collection('favorites');
  await favoritesCol.createIndex(
    { user_id: 1, ad_id: 1 },
    { unique: true, partialFilterExpression: { deleted: false } }
  );
  await favoritesCol.createIndex({ user_id: 1 });
  await favoritesCol.createIndex({ added_at: -1 });

  const subscriptionsCol = db.collection('subscriptions');
  await subscriptionsCol.createIndex({ user_id: 1, status: 1 });
  await subscriptionsCol.createIndex({ user_id: 1, subscription_type: 1, status: 1 });
  await subscriptionsCol.createIndex({ status: 1, created_at: -1 });
  await subscriptionsCol.createIndex({ status: 1, end_date: 1 });

  console.log('[mongodb] Index favorites + subscriptions créés');
}

// Retourne l'instance de base MongoDB connectée.
function getDb() {
  if (!db) throw new Error('MongoDB non connecté — appelez connectMongo() au démarrage');
  return db;
}

// Ferme proprement la connexion MongoDB et réinitialise les références.
async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = { connectMongo, getDb, closeMongo };
