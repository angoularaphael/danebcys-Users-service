const authClient = require('./authClient');
const { NotFoundError, BadRequestError } = require('../utils/errors');

async function getProfile(userId) {
  const { user } = await authClient.getUser(userId);
  if (!user) throw new NotFoundError('Utilisateur non trouvé');
  return formatUser(user);
}

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

async function deleteAccount(userId) {
  await authClient.softDeleteUser(userId);
}

async function requestPremium(userId, premiumLevel, studentProof) {
  const valid = ['premium', 'premium_avancee', 'etudiant'];
  if (!valid.includes(premiumLevel)) {
    throw new BadRequestError(`Niveau invalide. Valeurs acceptées : ${valid.join(', ')}`);
  }
  if (premiumLevel === 'etudiant' && !studentProof) {
    throw new BadRequestError('Justificatif étudiant requis pour le niveau étudiant');
  }
  const { user } = await authClient.updateUserPremium(userId, premiumLevel, studentProof);
  return formatUser(user);
}

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

module.exports = { getProfile, updateProfile, deleteAccount, requestPremium, formatUser };
