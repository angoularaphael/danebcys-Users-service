// Contrôleurs HTTP : liste de favoris produits
const favoriteService = require('../services/favorite.service');
const { BadRequestError } = require('../utils/errors');

// Liste paginée des annonces favorites de l'utilisateur authentifié (MongoDB local).
async function listFavorites(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const data = await favoriteService.listFavorites(req.user.id, { page, limit });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// Ajoute une annonce aux favoris de l'utilisateur authentifié.
async function addFavorite(req, res, next) {
  try {
    const { adId } = req.params;
    if (!adId) throw new BadRequestError('adId requis');
    const result = await favoriteService.addFavorite(req.user.id, adId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// Retire une annonce des favoris de l'utilisateur authentifié.
async function removeFavorite(req, res, next) {
  try {
    const { adId } = req.params;
    if (!adId) throw new BadRequestError('adId requis');
    await favoriteService.removeFavorite(req.user.id, adId);
    res.json({ message: 'Favori retiré' });
  } catch (err) {
    next(err);
  }
}

// Vérifie si une annonce est dans les favoris de l'utilisateur authentifié.
async function checkFavorite(req, res, next) {
  try {
    const { adId } = req.params;
    if (!adId) throw new BadRequestError('adId requis');
    const isFav = await favoriteService.isFavorite(req.user.id, adId);
    res.json({ isFavorite: isFav });
  } catch (err) {
    next(err);
  }
}

// Retourne le nombre total de favoris actifs de l'utilisateur authentifié.
async function countFavorites(req, res, next) {
  try {
    const count = await favoriteService.countFavorites(req.user.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

module.exports = { listFavorites, addFavorite, removeFavorite, checkFavorite, countFavorites };
