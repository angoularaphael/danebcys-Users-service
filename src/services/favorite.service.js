const { getDb } = require('../config/mongodb');
const { ConflictError, NotFoundError } = require('../utils/errors');

function col() {
  return getDb().collection('favorites');
}

async function listFavorites(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [favorites, total] = await Promise.all([
    col()
      .find({ user_id: userId, deleted: false })
      .sort({ added_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    col().countDocuments({ user_id: userId, deleted: false })
  ]);

  return {
    favorites: favorites.map(formatFavorite),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };
}

async function addFavorite(userId, adId) {
  const existing = await col().findOne({ user_id: userId, ad_id: adId, deleted: false });
  if (existing) throw new ConflictError('Déjà dans les favoris');

  const softDeleted = await col().findOne({ user_id: userId, ad_id: adId, deleted: true });
  if (softDeleted) {
    await col().updateOne(
      { _id: softDeleted._id },
      { $set: { deleted: false, added_at: new Date() } }
    );
    return { userId, adId, addedAt: new Date() };
  }

  await col().insertOne({
    user_id: userId,
    ad_id: adId,
    added_at: new Date(),
    deleted: false
  });

  return { userId, adId, addedAt: new Date() };
}

async function removeFavorite(userId, adId) {
  const result = await col().updateOne(
    { user_id: userId, ad_id: adId, deleted: false },
    { $set: { deleted: true } }
  );
  if (result.matchedCount === 0) throw new NotFoundError('Favori non trouvé');
}

async function isFavorite(userId, adId) {
  const doc = await col().findOne({ user_id: userId, ad_id: adId, deleted: false });
  return !!doc;
}

async function countFavorites(userId) {
  return col().countDocuments({ user_id: userId, deleted: false });
}

function formatFavorite(doc) {
  return {
    id: doc._id.toString(),
    adId: doc.ad_id,
    addedAt: doc.added_at
  };
}

module.exports = { listFavorites, addFavorite, removeFavorite, isFavorite, countFavorites };
