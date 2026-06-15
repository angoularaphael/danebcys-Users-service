/**
 * Tests d'intégration de subscription.service après fusion dans Users-service.
 *
 * On mocke :
 *  - mongodb (getDb) → fake collection in-memory
 *  - authClient    → stubs prévisibles (rôles, getUser, updateUserPremium…)
 *  - notificationsClient → stub no-op (capture des appels)
 */

const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createFakeCollection } = require('./helpers/fakeMongoCollection');

const fakeCol = createFakeCollection();

// 1. Mock du module mongodb config pour fournir getDb()
const mongodbConfigPath = path.resolve(__dirname, '..', 'src', 'config', 'mongodb.js');
require.cache[mongodbConfigPath] = {
  id: mongodbConfigPath,
  filename: mongodbConfigPath,
  loaded: true,
  exports: {
    getDb: () => ({ collection: () => fakeCol }),
    connectMongo: async () => {},
    closeMongo: async () => {}
  }
};

// 2. Mock authClient
const authClientPath = path.resolve(__dirname, '..', 'src', 'services', 'authClient.js');
const authStub = {
  _users: new Map(),
  _admins: [{ id: 'admin-1' }, { id: 'admin-2' }],
  _calls: [],
  validateToken: async () => ({ user: null }),
  getUser: async (userId) => ({ user: authStub._users.get(userId) || { id: userId, role: 'user', role_id: 'role-user', premium_level: 'none', student_proof: null } }),
  updateUser: async () => ({}),
  listUsers: async () => ({ users: [], pagination: {} }),
  updateUserRole: async (userId, roleId) => { authStub._calls.push(['role', userId, roleId]); return {}; },
  updateUserPremium: async (userId, level, proof) => { authStub._calls.push(['premium', userId, level, proof]); return {}; },
  softDeleteUser: async () => ({}),
  restoreUser: async () => ({}),
  getRoles: async () => ({ roles: [{ id: 'role-user', name: 'user' }, { id: 'role-vendeur', name: 'vendeur' }, { id: 'role-admin', name: 'admin' }] }),
  getUsersByRole: async (role) => (role === 'admin' ? authStub._admins : [])
};
require.cache[authClientPath] = {
  id: authClientPath, filename: authClientPath, loaded: true, exports: authStub
};

// 3. Mock notificationsClient
const notifClientPath = path.resolve(__dirname, '..', 'src', 'services', 'notificationsClient.js');
const notifStub = {
  _sent: [],
  send: async (userId, type, message) => { notifStub._sent.push({ userId, type, message }); }
};
require.cache[notifClientPath] = {
  id: notifClientPath, filename: notifClientPath, loaded: true, exports: notifStub
};

const subscriptionService = require('../src/services/subscription.service');

const USER_PREMIUM = 'user-pp';
const VALID_CARD = {
  paymentMethod: 'card',
  cardNumber: '4111 1111 1111 1111',
  expiryMonth: '12',
  expiryYear: '2030',
  cvv: '123',
  holderName: 'John Doe'
};

test.beforeEach(() => {
  fakeCol._reset();
  authStub._calls.length = 0;
  notifStub._sent.length = 0;
});

test('createRequest valide un paiement premium et notifie les admins', async () => {
  const sub = await subscriptionService.createRequest(USER_PREMIUM, {
    subscriptionType: 'premium',
    premiumLevel: 'premium',
    ...VALID_CARD
  });
  assert.equal(sub.status, 'pending');
  assert.equal(sub.paymentStatus, 'pending_approval');
  assert.equal(sub.cardLast4, '1111');
  assert.equal(sub.planAmountEur, 79);

  await new Promise((r) => setImmediate(r));
  assert.equal(notifStub._sent.length, 2, 'les 2 admins ont été notifiés');
  assert.equal(notifStub._sent[0].type, 'subscription_pending');
});

test('createRequest exige une preuve étudiante pour premium étudiant', async () => {
  await assert.rejects(
    () => subscriptionService.createRequest(USER_PREMIUM, {
      subscriptionType: 'premium',
      premiumLevel: 'etudiant',
      ...VALID_CARD
    }),
    /Justificatif etudiant requis/
  );
});

test('createRequest refuse un numéro de carte invalide', async () => {
  await assert.rejects(
    () => subscriptionService.createRequest(USER_PREMIUM, {
      subscriptionType: 'premium',
      premiumLevel: 'premium',
      ...VALID_CARD,
      cardNumber: '12'
    }),
    /Numero de carte invalide/
  );
});

test('createRequest refuse une seconde demande pendant qu\'une est pending', async () => {
  await subscriptionService.createRequest(USER_PREMIUM, {
    subscriptionType: 'premium',
    premiumLevel: 'premium',
    ...VALID_CARD
  });
  await assert.rejects(
    () => subscriptionService.createRequest(USER_PREMIUM, {
      subscriptionType: 'premium',
      premiumLevel: 'premium',
      ...VALID_CARD
    }),
    /deja une demande en attente/
  );
});

test('approve d\'un premium met à jour Auth et notifie le user', async () => {
  const sub = await subscriptionService.createRequest(USER_PREMIUM, {
    subscriptionType: 'premium',
    premiumLevel: 'premium',
    ...VALID_CARD
  });
  authStub._calls.length = 0;
  notifStub._sent.length = 0;

  const approved = await subscriptionService.approve(sub.id);
  assert.equal(approved.status, 'active');
  assert.equal(approved.paymentStatus, 'approved');
  assert.ok(approved.startDate instanceof Date);
  assert.ok(approved.endDate instanceof Date);

  const premiumCalls = authStub._calls.filter((c) => c[0] === 'premium');
  assert.equal(premiumCalls.length, 1);
  assert.equal(premiumCalls[0][1], USER_PREMIUM);
  assert.equal(premiumCalls[0][2], 'premium');

  const notifs = notifStub._sent.filter((n) => n.userId === USER_PREMIUM);
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].type, 'subscription_approved');
});

test('approve d\'un seller_starter passe le user au rôle vendeur', async () => {
  const userId = 'user-vendor';
  const sub = await subscriptionService.createRequest(userId, {
    subscriptionType: 'seller',
    sellerPlan: 'seller_starter',
    billingCycle: 'annual',
    ...VALID_CARD
  });
  authStub._calls.length = 0;

  await subscriptionService.approve(sub.id);

  const roleCalls = authStub._calls.filter((c) => c[0] === 'role');
  assert.equal(roleCalls.length, 1);
  assert.equal(roleCalls[0][1], userId);
  assert.equal(roleCalls[0][2], 'role-vendeur');
});

test('reject d\'un premium restaure l\'état précédent', async () => {
  authStub._users.set(USER_PREMIUM, {
    id: USER_PREMIUM, role: 'user', role_id: 'role-user',
    premium_level: 'premium', student_proof: 'old-proof'
  });

  const sub = await subscriptionService.createRequest(USER_PREMIUM, {
    subscriptionType: 'premium',
    premiumLevel: 'premium_avancee',
    ...VALID_CARD
  });
  authStub._calls.length = 0;
  notifStub._sent.length = 0;

  const rejected = await subscriptionService.reject(sub.id);
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.paymentStatus, 'rejected');

  const premiumCalls = authStub._calls.filter((c) => c[0] === 'premium');
  assert.equal(premiumCalls[0][2], 'premium', 'restauration du niveau précédent');
  assert.equal(premiumCalls[0][3], 'old-proof');

  const notifs = notifStub._sent.filter((n) => n.userId === USER_PREMIUM);
  assert.equal(notifs[0].type, 'subscription_rejected');
});

test('listPending paginate et filtre par type', async () => {
  for (let i = 0; i < 3; i++) {
    await subscriptionService.createRequest(`user-${i}`, {
      subscriptionType: 'premium',
      premiumLevel: 'premium',
      ...VALID_CARD
    });
  }
  await subscriptionService.createRequest('user-vendor', {
    subscriptionType: 'seller',
    sellerPlan: 'seller_starter',
    billingCycle: 'annual',
    ...VALID_CARD
  });

  const allPending = await subscriptionService.listPending(1, 10);
  assert.equal(allPending.subscriptions.length, 4);

  const onlyPremium = await subscriptionService.listPending(1, 10, 'premium');
  assert.equal(onlyPremium.subscriptions.length, 3);

  const onlySeller = await subscriptionService.listPending(1, 10, 'seller');
  assert.equal(onlySeller.subscriptions.length, 1);
});

test('runExpirationChecks expire les abonnements à end_date passée', async () => {
  const userId = 'user-exp';
  const sub = await subscriptionService.createRequest(userId, {
    subscriptionType: 'premium',
    premiumLevel: 'premium',
    ...VALID_CARD
  });
  await subscriptionService.approve(sub.id);

  const all = fakeCol._all();
  const stored = all.find((d) => d._id.toString() === sub.id);
  stored.end_date = new Date(Date.now() - 24 * 60 * 60 * 1000);

  authStub._calls.length = 0;
  notifStub._sent.length = 0;

  await subscriptionService.runExpirationChecks();

  const after = await fakeCol.findOne({ user_id: userId });
  assert.equal(after.status, 'expired');
  assert.equal(after.payment_status, 'expired');

  const premiumCalls = authStub._calls.filter((c) => c[0] === 'premium');
  assert.equal(premiumCalls[0][2], 'none');

  const notifs = notifStub._sent.filter((n) => n.userId === userId);
  assert.equal(notifs[0].type, 'subscription_expired');
});

test('getMySubscription renvoie l\'abonnement actif s\'il existe', async () => {
  const sub = await subscriptionService.createRequest(USER_PREMIUM, {
    subscriptionType: 'premium',
    premiumLevel: 'premium',
    ...VALID_CARD
  });
  await subscriptionService.approve(sub.id);

  const my = await subscriptionService.getMySubscription(USER_PREMIUM);
  assert.equal(my.status, 'active');
  assert.equal(my.premiumLevel, 'premium');
});

test('getMySubscription renvoie un placeholder si aucun abonnement', async () => {
  const my = await subscriptionService.getMySubscription('user-without-sub');
  assert.equal(my.status, 'none');
  assert.equal(my.id, null);
});
