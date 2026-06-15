// Contrôleurs HTTP admin : gestion des utilisateurs et abonnements
const authClient = require('../services/authClient');
const subscriptionService = require('../services/subscription.service');
const { formatUser } = require('../services/profile.service');
const { BadRequestError } = require('../utils/errors');

// Liste paginée des utilisateurs — délègue au auth-service:3001 (GET /internal/users).
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

// Détail d'un utilisateur par ID — délègue au auth-service:3001 (GET /internal/users/:id).
async function getUser(req, res, next) {
  try {
    const { user } = await authClient.getUser(req.params.id);
    res.json({ user: formatUser(user) });
  } catch (err) {
    next(err);
  }
}

// Modifie le rôle d'un utilisateur — délègue au auth-service:3001 (PUT /internal/users/:id/role).
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

// Suppression logique d'un utilisateur — délègue au auth-service:3001 (DELETE /internal/users/:id).
async function deleteUser(req, res, next) {
  try {
    await authClient.softDeleteUser(req.params.id);
    res.json({ message: 'Utilisateur supprimé (soft delete)' });
  } catch (err) {
    next(err);
  }
}

// Restaure un utilisateur supprimé — délègue au auth-service:3001 (PUT /internal/users/:id/restore).
async function restoreUser(req, res, next) {
  try {
    const result = await authClient.restoreUser(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Liste des rôles disponibles — délègue au auth-service:3001 (GET /internal/roles).
async function getRoles(_req, res, next) {
  try {
    const result = await authClient.getRoles();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Liste paginée des demandes d'abonnement en attente (MongoDB local).
async function listPendingSubscriptions(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const data = await subscriptionService.listPending(page, limit, req.query.type);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// Valide une demande d'abonnement (1 mois premium ou 12 mois vendeur).
// Met à jour auth-service:3001 et notifie via communication-service:3006.
async function approveSubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.approve(req.params.id);
    res.json({ subscription, message: 'Abonnement validé (1 mois)' });
  } catch (err) {
    next(err);
  }
}

// Refuse une demande d'abonnement en attente.
// Restaure le profil sur auth-service:3001 et notifie via communication-service:3006.
async function rejectSubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.reject(req.params.id);
    res.json({ subscription, message: 'Demande refusée' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers, getUser, updateUserRole, deleteUser, restoreUser, getRoles,
  listPendingSubscriptions, approveSubscription, rejectSubscription
};
