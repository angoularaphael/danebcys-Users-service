// Contrôleurs HTTP : profil utilisateur (lecture, mise à jour, suppression)
const profileService = require('../services/profile.service');
const { getUserOrders } = require('../services/ordersClient');
const notificationsProxy = require('../services/notificationsProxy');
const subscriptionService = require('../services/subscription.service');
const { getUser } = require('../services/authClient');
const { BadRequestError } = require('../utils/errors');

// Extrait l'en-tête Authorization Bearer de la requête entrante.
function getAuthHeader(req) {
  return req.headers.authorization || null;
}

// Retourne le profil complet de l'utilisateur authentifié (via auth-service:3001).
async function getMyProfile(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.id);
    res.json({ user: profile });
  } catch (err) {
    next(err);
  }
}

// Met à jour le profil de l'utilisateur authentifié (via auth-service:3001).
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

// Supprime le compte de l'utilisateur authentifié (soft delete via auth-service:3001).
async function deleteMyAccount(req, res, next) {
  try {
    await profileService.deleteAccount(req.user.id);
    res.json({ message: 'Compte supprimé avec succès' });
  } catch (err) {
    next(err);
  }
}

// Retourne le profil public d'un utilisateur (champs limités, via auth-service:3001).
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

// Liste paginée des commandes de l'utilisateur — proxy vers orders-service:3005.
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

// Liste les notifications de l'utilisateur — proxy vers communication-service:3006.
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

// Marque une notification comme lue — proxy vers communication-service:3006.
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

// Marque toutes les notifications comme lues — proxy vers communication-service:3006.
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

// Retourne le nombre de notifications non lues — proxy vers communication-service:3006.
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

// Retourne l'abonnement actif ou en attente de l'utilisateur authentifié (MongoDB local).
async function getMySubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.getMySubscription(req.user.id, req.query.type);
    res.json({ subscription });
  } catch (err) {
    next(err);
  }
}

// Soumet une demande d'abonnement premium ou vendeur (MongoDB local + notification admins).
async function createSubscription(req, res, next) {
  try {
    const { subscriptionType, premiumLevel } = req.body || {};
    if (!subscriptionType && !premiumLevel) {
      throw new BadRequestError('subscriptionType ou premiumLevel requis');
    }
    const subscription = await subscriptionService.createRequest(req.user.id, req.body || {});
    res.status(201).json({
      subscription,
      message: 'Paiement enregistre. La demande est en attente de validation administrateur.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyProfile, updateMyProfile, deleteMyAccount,
  getPublicProfile, getMyOrders,
  getMyNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount,
  getMySubscription, createSubscription
};
