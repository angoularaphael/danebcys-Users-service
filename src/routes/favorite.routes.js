// Routes favoris /api/v1/favorites
const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const { userLimiter } = require('../middlewares/rateLimiter');
const ctrl = require('../controllers/favorite.controller');

// Routeur des favoris publics (/api/v1/favorites).
const router = Router();

router.use(authenticate);
router.use(userLimiter);

router.get('/', ctrl.listFavorites);
router.get('/count', ctrl.countFavorites);
router.get('/:adId/check', ctrl.checkFavorite);
router.post('/:adId', ctrl.addFavorite);
router.delete('/:adId', ctrl.removeFavorite);

module.exports = router;
