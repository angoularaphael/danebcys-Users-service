// Application Express Users-service : profils, favoris, abonnements et routes internes (port 3002)
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const favoriteRoutes = require('./routes/favorite.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const internalRoutes = require('./routes/internal.routes');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware global : extrait l'adresse IP cliente depuis les en-têtes proxy
// (X-Client-Ip, X-Forwarded-For) ou depuis la connexion directe.
app.use((req, _res, next) => {
  req.clientIp = req.headers['x-client-ip'] || req.headers['x-forwarded-for'] || req.ip;
  next();
});

app.use('/api/v1/users/admin', adminRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/internal', internalRoutes);

// Point de contrôle de santé du service (utilisé par Docker / orchestration).
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'users-service' });
});

// Gestionnaire d'erreurs global : renvoie le message et le code HTTP de l'erreur,
// avec la stack trace en environnement de développement uniquement.
app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
