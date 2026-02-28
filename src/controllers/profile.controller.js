const profileService = require('../services/profile.service');
const { getUserOrders } = require('../services/ordersClient');
const notificationsProxy = require('../services/notificationsProxy');
const subscriptionsProxy = require('../services/subscriptionsProxy');
const { getUser } = require('../services/authClient');
const { BadRequestError } = require('../utils/errors');

function getAuthHeader(req) {
  return req.headers.authorization || null;
}

async function getMyProfile(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.id);
    res.json({ user: profile });
  } catch (err) {
    next(err);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const { username, firstName, lastName, phone, country } = req.body;
    const profile = await profileService.updateProfile(req.user.id, {
      username, firstName, lastName, phone, country
    });
    res.json({ user: profile });
  } catch (err) {
    next(err);
  }
}

async function deleteMyAccount(req, res, next) {
  try {
    await profileService.deleteAccount(req.user.id);
    res.json({ message: 'Compte supprimé avec succès' });
  } catch (err) {
    next(err);
  }
}

async function getPublicProfile(req, res, next) {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const { id, username, premium_level, country, created_at } = user;
    res.json({ user: { id, username, premiumLevel: premium_level, country, createdAt: created_at } });
  } catch (err) {
    next(err);
  }
}

async function getMyOrders(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const data = await getUserOrders(req.user.id, page, limit);
    res.json(data);
  } catch (err) {
    if (err.message && err.message.includes('injoignable')) {
      return res.status(503).json({ error: 'Service commandes indisponible' });
    }
    next(err);
  }
}

async function getMyNotifications(req, res, next) {
  try {
    const qs = new URLSearchParams(req.query).toString();
    const data = await notificationsProxy.listNotifications(getAuthHeader(req), qs);
    res.json(data);
  } catch (err) {
    if (err.message?.includes('Notifications Service')) {
      return res.status(503).json({ error: 'Service notifications indisponible' });
    }
    next(err);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const data = await notificationsProxy.markAsRead(getAuthHeader(req), req.params.id);
    res.json(data);
  } catch (err) {
    if (err.statusCode === 404) return res.status(404).json({ error: 'Notification non trouvée' });
    if (err.message?.includes('Notifications Service')) {
      return res.status(503).json({ error: 'Service notifications indisponible' });
    }
    next(err);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const data = await notificationsProxy.markAllAsRead(getAuthHeader(req));
    res.json(data);
  } catch (err) {
    if (err.message?.includes('Notifications Service')) {
      return res.status(503).json({ error: 'Service notifications indisponible' });
    }
    next(err);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const data = await notificationsProxy.getUnreadCount(getAuthHeader(req));
    res.json(data);
  } catch (err) {
    if (err.message?.includes('Notifications Service')) {
      return res.status(503).json({ error: 'Service notifications indisponible' });
    }
    next(err);
  }
}

async function getMySubscription(req, res, next) {
  try {
    const data = await subscriptionsProxy.getMySubscription(getAuthHeader(req));
    res.json(data);
  } catch (err) {
    if (err.message?.includes('Subscriptions Service')) {
      return res.status(503).json({ error: 'Service abonnements indisponible' });
    }
    next(err);
  }
}

async function createSubscription(req, res, next) {
  try {
    const { premiumLevel, studentProof } = req.body;
    if (!premiumLevel) throw new BadRequestError('premiumLevel requis');
    const data = await subscriptionsProxy.createSubscription(getAuthHeader(req), { premiumLevel, studentProof });
    res.status(201).json(data);
  } catch (err) {
    if (err.message?.includes('Subscriptions Service')) {
      return res.status(503).json({ error: 'Service abonnements indisponible' });
    }
    next(err);
  }
}

module.exports = {
  getMyProfile, updateMyProfile, deleteMyAccount,
  getPublicProfile, getMyOrders,
  getMyNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount,
  getMySubscription, createSubscription
};
