// Profil utilisateur : lecture et mise à jour via auth-service
const authClient = require('./authClient');
const { NotFoundError, BadRequestError } = require('../utils/errors');

// Récupère le profil complet d'un utilisateur via auth-service:3001.
async function getProfile(userId) {
  const { user } = await authClient.getUser(userId);
  if (!user) throw new NotFoundError('Utilisateur non trouvé');
  return formatUser(user);
}

// Met à jour les champs autorisés du profil via auth-service:3001.
async function updateProfile(userId, data) {
  const allowed = ['username', 'firstName', 'lastName', 'phone', 'country'];
  const update = {};
  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  if (Object.keys(update).length === 0) {
    throw new BadRequestError('Aucun champ à mettre à jour');
  }

  const { user } = await authClient.updateUser(userId, update);
  return formatUser(user);
}

// Supprime logiquement le compte utilisateur via auth-service:3001.
async function deleteAccount(userId) {
  await authClient.softDeleteUser(userId);
}

// Convertit une ligne utilisateur auth-service en objet profil au format API (camelCase).
function formatUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    phone: row.phone,
    firstName: row.first_name,
    lastName: row.last_name,
    emailVerified: row.email_verified,
    phoneVerified: row.phone_verified,
    role: row.role,
    premiumLevel: row.premium_level,
    studentProof: row.student_proof,
    country: row.country,
    deleted: row.deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at
  };
}

module.exports = { getProfile, updateProfile, deleteAccount, formatUser };
