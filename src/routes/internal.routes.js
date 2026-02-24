const { Router } = require('express');
const crypto = require('crypto');
const env = require('../config/env');
const favoriteService = require('../services/favorite.service');

const router = Router();

/**
 * Auth inter-microservices par X-Service-Key.
 * Même pattern que le Auth Service (SHA-256 + timingSafeEqual).
 */
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

// ─── Vérifier si un user a un favori ────────────────────────────────
router.get('/favorites/:userId/:adId', async (req, res) => {
  try {
    const isFav = await favoriteService.isFavorite(req.params.userId, req.params.adId);
    res.json({ isFavorite: isFav });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Compter les favoris d'un user ──────────────────────────────────
router.get('/favorites/:userId/count', async (req, res) => {
  try {
    const count = await favoriteService.countFavorites(req.params.userId);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
