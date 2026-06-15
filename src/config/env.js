// Variables obligatoires — un avertissement s'affiche si l'une manque.
const requiredVars = [
  'PG_HOST', 'PG_PORT', 'PG_DATABASE', 'PG_USER', 'PG_PASSWORD',
  'MONGO_URI', 'MONGO_DB_NAME',
  'AUTH_SERVICE_URL', 'INTER_SERVICE_KEY'
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    console.warn(`[env] Variable manquante: ${key}`);
  }
}

module.exports = {
  // Port d'écoute du service (défaut 3002).
  PORT: parseInt(process.env.PORT, 10) || 3002,
  // Mode dev ou production.
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Connexion PostgreSQL — adresses utilisateur.
  PG_HOST: process.env.PG_HOST || 'localhost',
  PG_PORT: parseInt(process.env.PG_PORT, 10) || 5432,
  PG_DATABASE: process.env.PG_DATABASE || 'danebcys',
  PG_USER: process.env.PG_USER || 'postgres',
  PG_PASSWORD: process.env.PG_PASSWORD || 'postgres',

  // Connexion MongoDB — favoris et abonnements.
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017',
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || 'danebcys',

  // Appelle Auth-service port 3001 (tokens, profils, rôles).
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  // Appelle Communication-service port 3006 (notifications).
  NOTIFICATIONS_SERVICE_URL: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3006',
  // Clé secrète partagée entre microservices.
  INTER_SERVICE_KEY: process.env.INTER_SERVICE_KEY,

  // Limite de requêtes : fenêtre en ms (défaut 15 min).
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  // Limite de requêtes : max par fenêtre (défaut 100).
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
};
