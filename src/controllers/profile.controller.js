const profileService = require('../services/profile.service');
const { BadRequestError } = require('../utils/errors');

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

async function requestPremium(req, res, next) {
  try {
    const { premiumLevel, studentProof } = req.body;
    if (!premiumLevel) throw new BadRequestError('premiumLevel requis');

    const profile = await profileService.requestPremium(req.user.id, premiumLevel, studentProof);
    res.json({ user: profile, message: 'Niveau premium mis à jour' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyProfile, updateMyProfile, deleteMyAccount, requestPremium };
