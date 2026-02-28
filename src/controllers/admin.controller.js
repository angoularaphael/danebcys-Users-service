const authClient = require('../services/authClient');
const subscriptionsProxy = require('../services/subscriptionsProxy');
const { formatUser } = require('../services/profile.service');
const { BadRequestError } = require('../utils/errors');

function getAuthHeader(req) {
  return req.headers.authorization || null;
}

async function listUsers(req, res, next) {
  try {
    const { page, limit, search, role, deleted } = req.query;
    const result = await authClient.listUsers({ page, limit, search, role, deleted });
    res.json({
      users: result.users.map(formatUser),
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const { user } = await authClient.getUser(req.params.id);
    res.json({ user: formatUser(user) });
  } catch (err) {
    next(err);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const { roleId } = req.body;
    if (!roleId) throw new BadRequestError('roleId requis');
    const { user } = await authClient.updateUserRole(req.params.id, roleId);
    res.json({ user, message: 'Rôle mis à jour' });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    await authClient.softDeleteUser(req.params.id);
    res.json({ message: 'Utilisateur supprimé (soft delete)' });
  } catch (err) {
    next(err);
  }
}

async function restoreUser(req, res, next) {
  try {
    const result = await authClient.restoreUser(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getRoles(_req, res, next) {
  try {
    const result = await authClient.getRoles();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listPendingSubscriptions(req, res, next) {
  try {
    const qs = new URLSearchParams(req.query).toString();
    const data = await subscriptionsProxy.listPendingSubscriptions(getAuthHeader(req), qs);
    res.json(data);
  } catch (err) {
    if (err.message?.includes('Subscriptions Service')) {
      return res.status(503).json({ error: 'Service abonnements indisponible' });
    }
    next(err);
  }
}

async function approveSubscription(req, res, next) {
  try {
    const { startDate, endDate } = req.body;
    const data = await subscriptionsProxy.approveSubscription(getAuthHeader(req), req.params.id, { startDate, endDate });
    res.json(data);
  } catch (err) {
    if (err.message?.includes('Subscriptions Service')) {
      return res.status(503).json({ error: 'Service abonnements indisponible' });
    }
    next(err);
  }
}

async function rejectSubscription(req, res, next) {
  try {
    const data = await subscriptionsProxy.rejectSubscription(getAuthHeader(req), req.params.id);
    res.json(data);
  } catch (err) {
    if (err.message?.includes('Subscriptions Service')) {
      return res.status(503).json({ error: 'Service abonnements indisponible' });
    }
    next(err);
  }
}

module.exports = {
  listUsers, getUser, updateUserRole, deleteUser, restoreUser, getRoles,
  listPendingSubscriptions, approveSubscription, rejectSubscription
};
