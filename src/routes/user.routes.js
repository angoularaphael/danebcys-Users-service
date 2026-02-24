const { Router } = require('express');
const profileCtrl = require('../controllers/profile.controller');
const addressCtrl = require('../controllers/address.controller');
const favoriteCtrl = require('../controllers/favorite.controller');
const { authenticate } = require('../middlewares/auth');
const { userLimiter } = require('../middlewares/rateLimiter');

const router = Router();

router.use(authenticate, userLimiter);

// ─── Profil ─────────────────────────────────────────────────────────
router.get('/me', profileCtrl.getMyProfile);
router.put('/me', profileCtrl.updateMyProfile);
router.delete('/me', profileCtrl.deleteMyAccount);
router.put('/me/premium', profileCtrl.requestPremium);

// ─── Adresses ───────────────────────────────────────────────────────
router.get('/me/addresses', addressCtrl.listAddresses);
router.post('/me/addresses', addressCtrl.createAddress);
router.get('/me/addresses/:id', addressCtrl.getAddress);
router.put('/me/addresses/:id', addressCtrl.updateAddress);
router.delete('/me/addresses/:id', addressCtrl.deleteAddress);
router.put('/me/addresses/:id/default', addressCtrl.setDefault);

// ─── Favoris (MongoDB) ─────────────────────────────────────────────
router.get('/me/favorites', favoriteCtrl.listFavorites);
router.get('/me/favorites/count', favoriteCtrl.countFavorites);
router.get('/me/favorites/:adId/check', favoriteCtrl.checkFavorite);
router.post('/me/favorites/:adId', favoriteCtrl.addFavorite);
router.delete('/me/favorites/:adId', favoriteCtrl.removeFavorite);

module.exports = router;
