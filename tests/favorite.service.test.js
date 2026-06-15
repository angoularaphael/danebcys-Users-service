/**
 * Tests d'intégration de favorite.service (logique migrée depuis l'ancien
 * Favorites-service vers Users-service).
 *
 * On injecte une fausse collection Mongo dans le require cache pour
 * éviter de dépendre d'un vrai MongoDB pendant les tests.
 *
 * Exécuter : npm test
 */

const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createFakeCollection } = require('./helpers/fakeMongoCollection');

// 1) On instancie la fausse collection AVANT de charger favorite.service
//    pour que celui-ci utilise notre version de getDb().
const fakeCol = createFakeCollection();
const mongodbPath = path.resolve(__dirname, '..', 'src', 'config', 'mongodb.js');
require.cache[mongodbPath] = {
  id: mongodbPath,
  filename: mongodbPath,
  loaded: true,
  exports: {
    getDb: () => ({ collection: () => fakeCol }),
    connectMongo: async () => {},
    closeMongo: async () => {}
  }
};

// 2) Charger le service maintenant que le mock est en place.
const favoriteService = require('../src/services/favorite.service');
const { ConflictError, NotFoundError } = require('../src/utils/errors');

const USER_A = 'user-aaaa';
const USER_B = 'user-bbbb';
const AD_1 = 'ad-1111';
const AD_2 = 'ad-2222';

test.beforeEach(() => {
  fakeCol._reset();
});

test('addFavorite insère un nouveau favori', async () => {
  const result = await favoriteService.addFavorite(USER_A, AD_1);
  assert.equal(result.userId, USER_A);
  assert.equal(result.adId, AD_1);
  assert.ok(result.addedAt instanceof Date);
  assert.equal(fakeCol._all().length, 1);
});

test('addFavorite refuse un doublon (déjà actif)', async () => {
  await favoriteService.addFavorite(USER_A, AD_1);
  await assert.rejects(
    () => favoriteService.addFavorite(USER_A, AD_1),
    ConflictError
  );
  assert.equal(fakeCol._all().length, 1);
});

test('addFavorite réactive un favori soft-deleted (pas de doublon en base)', async () => {
  await favoriteService.addFavorite(USER_A, AD_1);
  await favoriteService.removeFavorite(USER_A, AD_1);
  // Doc présent mais deleted=true.
  assert.equal(fakeCol._all().length, 1);
  assert.equal(fakeCol._all()[0].deleted, true);

  await favoriteService.addFavorite(USER_A, AD_1);
  // Pas de nouveau document : on a réactivé le précédent.
  assert.equal(fakeCol._all().length, 1);
  assert.equal(fakeCol._all()[0].deleted, false);
});

test('removeFavorite marque deleted=true (soft delete)', async () => {
  await favoriteService.addFavorite(USER_A, AD_1);
  await favoriteService.removeFavorite(USER_A, AD_1);
  assert.equal(fakeCol._all()[0].deleted, true);
});

test('removeFavorite renvoie NotFoundError si le favori est absent', async () => {
  await assert.rejects(
    () => favoriteService.removeFavorite(USER_A, 'inexistant'),
    NotFoundError
  );
});

test('isFavorite renvoie true seulement pour un favori actif', async () => {
  assert.equal(await favoriteService.isFavorite(USER_A, AD_1), false);
  await favoriteService.addFavorite(USER_A, AD_1);
  assert.equal(await favoriteService.isFavorite(USER_A, AD_1), true);
  await favoriteService.removeFavorite(USER_A, AD_1);
  assert.equal(await favoriteService.isFavorite(USER_A, AD_1), false);
});

test('countFavorites compte uniquement les favoris actifs de l\'utilisateur', async () => {
  await favoriteService.addFavorite(USER_A, AD_1);
  await favoriteService.addFavorite(USER_A, AD_2);
  await favoriteService.addFavorite(USER_B, AD_1);
  await favoriteService.removeFavorite(USER_A, AD_2);

  assert.equal(await favoriteService.countFavorites(USER_A), 1);
  assert.equal(await favoriteService.countFavorites(USER_B), 1);
  assert.equal(await favoriteService.countFavorites('user-other'), 0);
});

test('listFavorites retourne les favoris actifs avec pagination', async () => {
  await favoriteService.addFavorite(USER_A, AD_1);
  await favoriteService.addFavorite(USER_A, AD_2);
  await favoriteService.addFavorite(USER_A, 'ad-3');
  await favoriteService.removeFavorite(USER_A, AD_1); // un actif retiré

  const res = await favoriteService.listFavorites(USER_A, { page: 1, limit: 10 });
  assert.equal(res.favorites.length, 2);
  assert.equal(res.pagination.total, 2);
  assert.equal(res.pagination.page, 1);
  assert.equal(res.pagination.pages, 1);
  for (const fav of res.favorites) {
    assert.ok(fav.id);
    assert.ok(fav.adId);
    assert.ok(fav.addedAt instanceof Date);
  }
});

test('listFavorites respecte la pagination (limit + page)', async () => {
  for (let i = 0; i < 5; i++) {
    await favoriteService.addFavorite(USER_A, `ad-${i}`);
  }

  const page1 = await favoriteService.listFavorites(USER_A, { page: 1, limit: 2 });
  const page2 = await favoriteService.listFavorites(USER_A, { page: 2, limit: 2 });
  const page3 = await favoriteService.listFavorites(USER_A, { page: 3, limit: 2 });

  assert.equal(page1.favorites.length, 2);
  assert.equal(page2.favorites.length, 2);
  assert.equal(page3.favorites.length, 1);
  assert.equal(page1.pagination.total, 5);
  assert.equal(page1.pagination.pages, 3);
});

test('isolation entre utilisateurs : USER_A ne voit pas les favoris de USER_B', async () => {
  await favoriteService.addFavorite(USER_A, AD_1);
  await favoriteService.addFavorite(USER_B, AD_2);

  const a = await favoriteService.listFavorites(USER_A, {});
  const b = await favoriteService.listFavorites(USER_B, {});

  assert.equal(a.favorites.length, 1);
  assert.equal(a.favorites[0].adId, AD_1);
  assert.equal(b.favorites.length, 1);
  assert.equal(b.favorites[0].adId, AD_2);
});
