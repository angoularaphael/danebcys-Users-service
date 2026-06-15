// Contrôleurs HTTP : abonnements premium et étudiant
const subscriptionService = require('../services/subscription.service');

// Retourne l'abonnement de l'utilisateur authentifié, filtré par type si demandé (MongoDB local).
async function getMySubscription(req, res, next) {
  try {
    const requestedType = req.query.type;
    const subscription = await subscriptionService.getMySubscription(req.user.id, requestedType);
    res.json({ subscription });
  } catch (err) {
    next(err);
  }
}

// Crée une demande d'abonnement premium ou vendeur pour l'utilisateur authentifié.
async function createSubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.createRequest(req.user.id, req.body || {});
    res.status(201).json({
      subscription,
      message: 'Paiement enregistre. La demande est en attente de validation administrateur.'
    });
  } catch (err) {
    next(err);
  }
}

// Liste paginée des demandes d'abonnement en attente (réservé admin, MongoDB local).
async function listPending(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const data = await subscriptionService.listPending(page, limit, req.query.type);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// Valide une demande d'abonnement — met à jour auth-service:3001 et notifie communication-service:3006.
async function approveSubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.approve(req.params.id);
    res.json({ subscription, message: 'Abonnement validé (1 mois)' });
  } catch (err) {
    next(err);
  }
}

// Refuse une demande d'abonnement — restaure le profil sur auth-service:3001.
async function rejectSubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.reject(req.params.id);
    res.json({ subscription, message: 'Demande refusée' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMySubscription,
  createSubscription,
  listPending,
  approveSubscription,
  rejectSubscription
};
