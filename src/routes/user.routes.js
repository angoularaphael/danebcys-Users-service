// Routes profil et adresses /api/v1/users
const { Router } = require('express');
const profileCtrl = require('../controllers/profile.controller');
const addressCtrl = require('../controllers/address.controller');
const favoriteCtrl = require('../controllers/favorite.controller');
const { authenticate } = require('../middlewares/auth');
const { userLimiter } = require('../middlewares/rateLimiter');

// Routeur principal des utilisateurs (/api/v1/users).
const router = Router();

router.use(authenticate, userLimiter);

// ─── Profil ─────────────────────────────────────────────────────────
router.get('/me', profileCtrl.getMyProfile);
router.put('/me', profileCtrl.updateMyProfile);
router.delete('/me', profileCtrl.deleteMyAccount);

// ─── Commandes (proxy vers Orders-service) ──────────────────────────
router.get('/me/orders', profileCtrl.getMyOrders);

// ─── Notifications (MongoDB) ────────────────────────────────────────
router.get('/me/notifications', profileCtrl.getMyNotifications);
router.get('/me/notifications/unread', profileCtrl.getUnreadCount);
router.put('/me/notifications/read-all', profileCtrl.markAllNotificationsRead);
router.put('/me/notifications/:id/read', profileCtrl.markNotificationRead);

// ─── Abonnements / Subscriptions ────────────────────────────────────
router.get('/me/subscription', profileCtrl.getMySubscription);
router.post('/me/subscription', profileCtrl.createSubscription);

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

// ─── Profil public ──────────────────────────────────────────────────
router.get('/:id', profileCtrl.getPublicProfile);

module.exports = router;
