const authClient = require('../services/authClient');
const { formatUser } = require('../services/profile.service');
const { BadRequestError } = require('../utils/errors');

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

async function updateUserPremium(req, res, next) {
  try {
    const { premiumLevel, studentProof } = req.body;
    if (!premiumLevel) throw new BadRequestError('premiumLevel requis');
    const { user } = await authClient.updateUserPremium(req.params.id, premiumLevel, studentProof);
    res.json({ user, message: 'Niveau premium mis à jour' });
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

module.exports = { listUsers, getUser, updateUserRole, updateUserPremium, deleteUser, restoreUser, getRoles };
