const favoriteService = require('../services/favorite.service');
const { BadRequestError } = require('../utils/errors');

async function listFavorites(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const result = await favoriteService.listFavorites(req.user.id, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function addFavorite(req, res, next) {
  try {
    const { adId } = req.params;
    if (!adId) throw new BadRequestError('adId requis');
    const favorite = await favoriteService.addFavorite(req.user.id, adId);
    res.status(201).json({ favorite, message: 'Ajouté aux favoris' });
  } catch (err) {
    next(err);
  }
}

async function removeFavorite(req, res, next) {
  try {
    const { adId } = req.params;
    if (!adId) throw new BadRequestError('adId requis');
    await favoriteService.removeFavorite(req.user.id, adId);
    res.json({ message: 'Retiré des favoris' });
  } catch (err) {
    next(err);
  }
}

async function checkFavorite(req, res, next) {
  try {
    const { adId } = req.params;
    const isFav = await favoriteService.isFavorite(req.user.id, adId);
    res.json({ isFavorite: isFav });
  } catch (err) {
    next(err);
  }
}

async function countFavorites(req, res, next) {
  try {
    const count = await favoriteService.countFavorites(req.user.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

module.exports = { listFavorites, addFavorite, removeFavorite, checkFavorite, countFavorites };
