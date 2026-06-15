// Routes internes inter-services /internal
const { Router } = require('express');
const crypto = require('crypto');
const env = require('../config/env');
const favoriteService = require('../services/favorite.service');

// Routeur des endpoints inter-services (/internal).
const router = Router();

// Middleware d'authentification inter-services via l'en-tête X-Service-Key.
// Compare la clé reçue à INTER_SERVICE_KEY par comparaison temporellement sûre (SHA-256).
function serviceAuth(req, res, next) {
  const key = req.headers['x-service-key'];
  if (!key) return res.status(401).json({ error: 'Header X-Service-Key manquant' });

  const hashA = crypto.createHash('sha256').update(String(key)).digest();
  const hashB = crypto.createHash('sha256').update(String(env.INTER_SERVICE_KEY)).digest();

  if (!crypto.timingSafeEqual(hashA, hashB)) {
    return res.status(403).json({ error: 'Clé de service invalide' });
  }

  req.isService = true;
  next();
}

router.use(serviceAuth);

// Compte les favoris d'un utilisateur — appelé par d'autres microservices (MongoDB local).
router.get('/favorites/:userId/count', async (req, res, next) => {
  try {
    const count = await favoriteService.countFavorites(req.params.userId);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// Vérifie si une annonce est favorite pour un utilisateur — appelé par d'autres microservices.
router.get('/favorites/:userId/:adId', async (req, res, next) => {
  try {
    const isFav = await favoriteService.isFavorite(req.params.userId, req.params.adId);
    res.json({ isFavorite: isFav });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
