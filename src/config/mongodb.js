const { MongoClient } = require('mongodb');
const env = require('./env');

let client = null;
let db = null;

async function connectMongo() {
  if (db) return db;

  client = new MongoClient(env.MONGO_URI, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000
  });

  await client.connect();
  db = client.db(env.MONGO_DB_NAME);

  await db.collection('favorites').createIndex(
    { user_id: 1, ad_id: 1 },
    { unique: true, partialFilterExpression: { deleted: false } }
  );
  await db.collection('favorites').createIndex({ user_id: 1 });

  console.log('[mongodb] Connecté à', env.MONGO_DB_NAME);
  return db;
}

function getDb() {
  if (!db) throw new Error('MongoDB non connecté — appelez connectMongo() au démarrage');
  return db;
}

async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = { connectMongo, getDb, closeMongo };
