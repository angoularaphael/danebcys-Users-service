// Abonnements premium : création, renouvellement et expiration
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/mongodb');
const authClient = require('./authClient');
const notificationsClient = require('./notificationsClient');
const { BadRequestError, NotFoundError } = require('../utils/errors');

// Niveaux premium autorisés pour les abonnements de type premium.
const VALID_LEVELS = ['premium', 'premium_avancee', 'etudiant'];
// Types d'abonnement supportés (premium utilisateur ou vendeur).
const VALID_TYPES = ['premium', 'seller'];
// Méthodes de paiement acceptées.
const VALID_PAYMENT_METHODS = ['card'];
// Statuts possibles d'un abonnement en base MongoDB.
const STATUS = { PENDING: 'pending', ACTIVE: 'active', EXPIRED: 'expired', REJECTED: 'rejected' };
// Statuts de paiement associés à un abonnement.
const PAYMENT_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

// Métadonnées des formules premium (libellé et montant en euros).
const PREMIUM_PLAN_META = {
  premium: { label: 'Premium', amount: 79 },
  premium_avancee: { label: 'Premium avance', amount: 129 },
  etudiant: { label: 'Premium etudiant', amount: 39 }
};

// Métadonnées des formules vendeur annuelles (libellé et montant en euros).
const SELLER_PLAN_META = {
  seller_starter: { label: 'Vendeur Starter annuel', amount: 149 },
  seller_growth: { label: 'Vendeur Growth annuel', amount: 299 },
  seller_pro: { label: 'Vendeur Pro annuel', amount: 499 }
};

// Cache en mémoire des rôles récupérés depuis auth-service:3001.
let rolesCache = null;

// Retourne la collection MongoDB subscriptions.
function col() {
  return getDb().collection('subscriptions');
}

// Normalise le type d'abonnement ; retourne 'premium' si la valeur est invalide.
function normalizeType(value) {
  return VALID_TYPES.includes(value) ? value : 'premium';
}

// Convertit un document MongoDB en objet abonnement au format API (camelCase).
function formatSubscription(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    userId: doc.user_id,
    subscriptionType: doc.subscription_type || 'premium',
    premiumLevel: doc.premium_level || 'none',
    sellerPlan: doc.seller_plan || null,
    planCode: doc.plan_code || null,
    planLabel: doc.plan_label || null,
    billingCycle: doc.billing_cycle || null,
    planAmountEur: doc.plan_amount_eur || 0,
    status: doc.status,
    paymentStatus: doc.payment_status || null,
    paymentMethod: doc.payment_method || null,
    cardLast4: doc.card_last4 || null,
    cardHolder: doc.card_holder || null,
    startDate: doc.start_date,
    endDate: doc.end_date,
    studentProof: doc.student_proof,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at
  };
}

// Valide et extrait les informations de carte bancaire (sans stocker le numéro complet).
function validateAndExtractCard(data) {
  const { paymentMethod, cardNumber, expiryMonth, expiryYear, cvv, holderName } = data;

  if (!paymentMethod || !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    throw new BadRequestError('paymentMethod requis (card)');
  }

  const sanitizedNumber = String(cardNumber || '').replace(/\D/g, '');
  const sanitizedMonth = String(expiryMonth || '').trim();
  const sanitizedYear = String(expiryYear || '').trim();
  const sanitizedCvv = String(cvv || '').trim();
  const sanitizedHolder = String(holderName || '').trim();

  if (sanitizedNumber.length < 13 || sanitizedNumber.length > 19) {
    throw new BadRequestError('Numero de carte invalide');
  }
  const month = Number(sanitizedMonth);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new BadRequestError('Mois d expiration invalide');
  }
  const year = Number(sanitizedYear);
  if (!Number.isInteger(year) || sanitizedYear.length < 2) {
    throw new BadRequestError('Annee d expiration invalide');
  }
  if (sanitizedCvv.length < 3 || sanitizedCvv.length > 4) {
    throw new BadRequestError('CVV invalide');
  }
  if (!sanitizedHolder) {
    throw new BadRequestError('Nom du titulaire requis');
  }

  return {
    method: paymentMethod,
    cardLast4: sanitizedNumber.slice(-4),
    cardHolder: sanitizedHolder
  };
}

// Résout l'ID d'un rôle par son nom via auth-service:3001 GET /internal/roles.
// Met en cache le résultat pour les appels suivants.
async function resolveRoleIdByName(roleName) {
  if (!rolesCache) {
    const rolesResponse = await authClient.getRoles();
    rolesCache = Array.isArray(rolesResponse.roles) ? rolesResponse.roles : [];
  }
  const found = rolesCache.find((role) => role.name === roleName);
  if (!found) {
    throw new BadRequestError(`Role introuvable: ${roleName}`);
  }
  return found.id;
}

// Retourne la durée d'un abonnement en mois selon son type (1 mois premium, 12 mois vendeur).
function getTypeDurationsInMonths(subscriptionType) {
  return subscriptionType === 'seller' ? 12 : 1;
}

// Crée une demande d'abonnement en attente de validation admin (MongoDB local).
// Notifie les administrateurs via communication-service:3006.
async function createRequest(userId, payload = {}) {
  const subscriptionType = normalizeType(payload.subscriptionType);
  const premiumLevel = payload.premiumLevel;
  const studentProof = typeof payload.studentProof === 'string' ? payload.studentProof.trim() : '';
  const sellerPlan = payload.sellerPlan;
  const expectedBillingCycle = subscriptionType === 'seller' ? 'annual' : 'monthly';
  const billingCycle = payload.billingCycle || expectedBillingCycle;

  if (billingCycle !== expectedBillingCycle) {
    throw new BadRequestError(`Cycle de facturation invalide pour ${subscriptionType}`);
  }

  let planCode;
  let planLabel;
  let planAmount;
  let normalizedPremiumLevel = 'none';
  let normalizedSellerPlan = null;

  if (subscriptionType === 'premium') {
    if (!premiumLevel || !VALID_LEVELS.includes(premiumLevel)) {
      throw new BadRequestError('premiumLevel requis (premium, premium_avancee, etudiant)');
    }
    if (premiumLevel === 'etudiant' && !studentProof) {
      throw new BadRequestError('Justificatif etudiant requis (fichier ou texte de reference)');
    }
    const meta = PREMIUM_PLAN_META[premiumLevel];
    planCode = premiumLevel;
    planLabel = meta.label;
    planAmount = meta.amount;
    normalizedPremiumLevel = premiumLevel;
  } else {
    if (!sellerPlan || !SELLER_PLAN_META[sellerPlan]) {
      throw new BadRequestError('sellerPlan requis (seller_starter, seller_growth, seller_pro)');
    }
    const meta = SELLER_PLAN_META[sellerPlan];
    planCode = sellerPlan;
    planLabel = meta.label;
    planAmount = meta.amount;
    normalizedSellerPlan = sellerPlan;
  }

  const existing = await col().findOne({
    user_id: userId,
    subscription_type: subscriptionType,
    status: { $in: [STATUS.PENDING, STATUS.ACTIVE] }
  });

  if (existing) {
    if (existing.status === STATUS.PENDING) {
      throw new BadRequestError('Vous avez deja une demande en attente pour ce type de formule');
    }
    throw new BadRequestError('Vous avez deja une formule active pour ce type d abonnement');
  }

  const card = validateAndExtractCard(payload);
  const { user } = await authClient.getUser(userId).catch(() => ({ user: null }));
  const previousPremiumLevel = user?.premium_level || 'none';
  const previousStudentProof = user?.student_proof || null;
  const previousRoleId = user?.role_id || null;
  const previousRole = user?.role || 'user';

  const now = new Date();
  const doc = {
    user_id: userId,
    subscription_type: subscriptionType,
    premium_level: normalizedPremiumLevel,
    seller_plan: normalizedSellerPlan,
    plan_code: planCode,
    plan_label: planLabel,
    billing_cycle: billingCycle,
    plan_amount_eur: planAmount,
    previous_premium_level: previousPremiumLevel,
    previous_student_proof: previousStudentProof,
    previous_role_id: previousRoleId,
    previous_role_name: previousRole,
    status: STATUS.PENDING,
    payment_status: PAYMENT_STATUS.PENDING_APPROVAL,
    payment_method: card.method,
    card_last4: card.cardLast4,
    card_holder: card.cardHolder,
    payment_submitted_at: now,
    start_date: null,
    end_date: null,
    student_proof: studentProof || null,
    created_at: now,
    updated_at: now,
    notified_2d: false,
    notified_1d: false
  };

  const result = await col().insertOne(doc);
  doc._id = result.insertedId;

  authClient
    .getUsersByRole('admin')
    .then((admins) => {
      const typeLabel = subscriptionType === 'premium' ? `premium (${planLabel})` : `vendeur (${planLabel})`;
      const message = `Nouvelle demande d'abonnement ${typeLabel} en attente de validation.`;
      const notifType = subscriptionType === 'premium' && normalizedPremiumLevel === 'etudiant'
        ? 'student_proof_pending'
        : 'subscription_pending';
      admins.forEach((admin) => {
        notificationsClient.send(admin.id, notifType, message).catch((err) => {
          console.error('[subscription] Notification admin:', err.message);
        });
      });
    })
    .catch((err) => console.error('[subscription] Récupération admins:', err.message));

  return formatSubscription(doc);
}

// Retourne l'abonnement actif ou en attente d'un utilisateur ; sinon le dernier historique ou un état vide.
// Enrichit avec le premium_level depuis auth-service:3001 si aucun abonnement trouvé.
async function getMySubscription(userId, requestedType) {
  const type = requestedType && VALID_TYPES.includes(requestedType) ? requestedType : null;
  const baseFilter = { user_id: userId };
  if (type) baseFilter.subscription_type = type;

  const active = await col().findOne(
    { ...baseFilter, status: { $in: [STATUS.PENDING, STATUS.ACTIVE] } },
    { sort: { created_at: -1 } }
  );

  if (active) return formatSubscription(active);

  const last = await col().findOne(baseFilter, { sort: { created_at: -1 } });
  if (last) return formatSubscription(last);

  const { user } = await authClient.getUser(userId).catch(() => ({ user: null }));
  return {
    id: null,
    userId,
    subscriptionType: type || 'premium',
    premiumLevel: user?.premium_level || 'none',
    sellerPlan: null,
    planCode: null,
    planLabel: null,
    billingCycle: null,
    planAmountEur: 0,
    status: 'none',
    paymentStatus: null,
    paymentMethod: null,
    cardLast4: null,
    cardHolder: null,
    startDate: null,
    endDate: null,
    studentProof: null,
    createdAt: null,
    updatedAt: null
  };
}

// Liste paginée des demandes d'abonnement en attente de validation admin.
async function listPending(page = 1, limit = 20, requestedType) {
  const skip = (page - 1) * limit;
  const filter = { status: STATUS.PENDING };
  if (requestedType && VALID_TYPES.includes(requestedType)) {
    filter.subscription_type = requestedType;
  }

  const [results, total] = await Promise.all([
    col().find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
    col().countDocuments(filter)
  ]);

  return {
    subscriptions: results.map(formatSubscription),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };
}

// Valide une demande d'abonnement : active la formule, met à jour auth-service:3001,
// notifie l'utilisateur via communication-service:3006.
async function approve(subscriptionId) {
  const id = new ObjectId(subscriptionId);
  const sub = await col().findOne({ _id: id });
  if (!sub) throw new NotFoundError('Demande non trouvee');
  if (sub.status !== STATUS.PENDING) {
    throw new BadRequestError('Cette demande n est plus en attente');
  }

  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + getTypeDurationsInMonths(sub.subscription_type));

  if (sub.subscription_type === 'seller') {
    const vendeurRoleId = await resolveRoleIdByName('vendeur');
    await authClient.updateUserRole(sub.user_id, vendeurRoleId);
  } else {
    await authClient.updateUserPremium(sub.user_id, sub.premium_level, sub.student_proof);
  }

  const now = new Date();
  await col().updateOne(
    { _id: id },
    {
      $set: {
        status: STATUS.ACTIVE,
        payment_status: PAYMENT_STATUS.APPROVED,
        start_date: start,
        end_date: end,
        updated_at: now
      }
    }
  );

  const updated = await col().findOne({ _id: id });
  const typeLabel = sub.subscription_type === 'seller' ? 'vendeur' : 'premium';
  await notificationsClient
    .send(
      sub.user_id,
      'subscription_approved',
      `Votre formule ${typeLabel} a ete validee. Debut: ${start.toLocaleDateString('fr-FR')}, fin: ${end.toLocaleDateString('fr-FR')}.`
    )
    .catch(() => {});

  return formatSubscription(updated);
}

// Refuse une demande d'abonnement : restaure le profil sur auth-service:3001,
// notifie l'utilisateur via communication-service:3006.
async function reject(subscriptionId) {
  const id = new ObjectId(subscriptionId);
  const sub = await col().findOne({ _id: id });
  if (!sub) throw new NotFoundError('Demande non trouvee');
  if (sub.status !== STATUS.PENDING) {
    throw new BadRequestError('Cette demande n est plus en attente');
  }

  if (sub.subscription_type === 'seller') {
    const fallbackRoleId = await resolveRoleIdByName('user');
    const roleToRestore = sub.previous_role_id || fallbackRoleId;
    await authClient.updateUserRole(sub.user_id, roleToRestore);
  } else {
    const previousLevel = sub.previous_premium_level || 'none';
    const previousProof = sub.previous_student_proof ?? null;
    await authClient.updateUserPremium(sub.user_id, previousLevel, previousProof);
  }

  const now = new Date();
  await col().updateOne(
    { _id: id },
    {
      $set: {
        status: STATUS.REJECTED,
        payment_status: PAYMENT_STATUS.REJECTED,
        updated_at: now
      }
    }
  );

  await notificationsClient
    .send(sub.user_id, 'subscription_rejected', 'Votre demande de formule a ete refusee par un administrateur.')
    .catch(() => {});

  const updated = await col().findOne({ _id: id });
  return formatSubscription(updated);
}

// Calcule le nombre de jours calendaires entre deux dates (d1 - d2).
function daysBetween(d1, d2) {
  const a = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const b = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

// Vérifie tous les abonnements actifs : expire ceux échus, envoie des rappels J-2 et J-1
// via communication-service:3006. Appelé par le job planifié expirationJob.
async function runExpirationChecks() {
  const now = new Date();
  const activeSubs = await col().find({ status: STATUS.ACTIVE }).toArray();

  for (const sub of activeSubs) {
    const end = sub.end_date;
    if (!end) continue;

    const daysLeft = daysBetween(end, now);

    if (daysLeft <= 0) {
      await expireSubscription(sub);
      continue;
    }

    if (daysLeft === 2 && !sub.notified_2d) {
      await notificationsClient.send(
        sub.user_id,
        'subscription_expiry',
        `Votre formule expire dans 2 jours (${end.toLocaleDateString('fr-FR')}). Pensez a la renouveler.`
      );
      await col().updateOne({ _id: sub._id }, { $set: { notified_2d: true } });
    } else if (daysLeft === 1 && !sub.notified_1d) {
      await notificationsClient.send(
        sub.user_id,
        'subscription_expiry',
        `Votre formule expire demain (${end.toLocaleDateString('fr-FR')}). Pensez a la renouveler.`
      );
      await col().updateOne({ _id: sub._id }, { $set: { notified_1d: true } });
    }
  }
}

// Expire un abonnement actif : restaure le rôle/premium sur auth-service:3001,
// notifie l'utilisateur via communication-service:3006.
async function expireSubscription(sub) {
  if (sub.subscription_type === 'seller') {
    const fallbackRoleId = await resolveRoleIdByName('user');
    const roleToRestore = sub.previous_role_id || fallbackRoleId;
    await authClient.updateUserRole(sub.user_id, roleToRestore);
  } else {
    await authClient.updateUserPremium(sub.user_id, 'none', null);
  }

  await col().updateOne(
    { _id: sub._id },
    {
      $set: {
        status: STATUS.EXPIRED,
        payment_status: PAYMENT_STATUS.EXPIRED,
        updated_at: new Date()
      }
    }
  );

  await notificationsClient.send(
    sub.user_id,
    'subscription_expired',
    'Votre formule est terminee. Vous pouvez faire une nouvelle demande a tout moment.'
  );
}

module.exports = {
  createRequest,
  getMySubscription,
  listPending,
  approve,
  reject,
  runExpirationChecks,
  STATUS,
  VALID_TYPES
};
