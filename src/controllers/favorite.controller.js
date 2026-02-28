const favoritesProxy = require('../services/favoritesProxy');
const { BadRequestError } = require('../utils/errors');

function getAuthHeader(req) {
  const h = req.headers.authorization;
  return h || null;
}

async function listFavorites(req, res, next) {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const qs = new URLSearchParams({ page, limit }).toString();
    const result = await favoritesProxy.listFavorites(getAuthHeader(req), qs);
    res.json(result);
  } catch (err) {
    if (err.message?.includes('Favorites Service')) {
      return res.status(503).json({ error: 'Service favoris indisponible' });
    }
    next(err);
  }
}

async function addFavorite(req, res, next) {
  try {
    const { adId } = req.params;
    if (!adId) throw new BadRequestError('adId requis');
    const result = await favoritesProxy.addFavorite(getAuthHeader(req), adId);
    res.status(201).json(result);
  } catch (err) {
    if (err.message?.includes('Favorites Service')) {
      return res.status(503).json({ error: 'Service favoris indisponible' });
    }
    next(err);
  }
}

async function removeFavorite(req, res, next) {
  try {
    const { adId } = req.params;
    if (!adId) throw new BadRequestError('adId requis');
    const result = await favoritesProxy.removeFavorite(getAuthHeader(req), adId);
    res.json(result);
  } catch (err) {
    if (err.message?.includes('Favorites Service')) {
      return res.status(503).json({ error: 'Service favoris indisponible' });
    }
    next(err);
  }
}

async function checkFavorite(req, res, next) {
  try {
    const { adId } = req.params;
    const result = await favoritesProxy.checkFavorite(getAuthHeader(req), adId);
    res.json(result);
  } catch (err) {
    if (err.message?.includes('Favorites Service')) {
      return res.status(503).json({ error: 'Service favoris indisponible' });
    }
    next(err);
  }
}

async function countFavorites(req, res, next) {
  try {
    const result = await favoritesProxy.countFavorites(getAuthHeader(req));
    res.json(result);
  } catch (err) {
    if (err.message?.includes('Favorites Service')) {
      return res.status(503).json({ error: 'Service favoris indisponible' });
    }
    next(err);
  }
}

module.exports = { listFavorites, addFavorite, removeFavorite, checkFavorite, countFavorites };
