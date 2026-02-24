const addressService = require('../services/address.service');

async function listAddresses(req, res, next) {
  try {
    const addresses = await addressService.listAddresses(req.user.id);
    res.json({ addresses });
  } catch (err) {
    next(err);
  }
}

async function getAddress(req, res, next) {
  try {
    const address = await addressService.getAddress(req.user.id, req.params.id);
    res.json({ address });
  } catch (err) {
    next(err);
  }
}

async function createAddress(req, res, next) {
  try {
    const address = await addressService.createAddress(req.user.id, req.body);
    res.status(201).json({ address });
  } catch (err) {
    next(err);
  }
}

async function updateAddress(req, res, next) {
  try {
    const address = await addressService.updateAddress(req.user.id, req.params.id, req.body);
    res.json({ address });
  } catch (err) {
    next(err);
  }
}

async function deleteAddress(req, res, next) {
  try {
    await addressService.deleteAddress(req.user.id, req.params.id);
    res.json({ message: 'Adresse supprimée' });
  } catch (err) {
    next(err);
  }
}

async function setDefault(req, res, next) {
  try {
    const address = await addressService.setDefault(req.user.id, req.params.id);
    res.json({ address, message: 'Adresse par défaut mise à jour' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAddresses, getAddress, createAddress, updateAddress, deleteAddress, setDefault };
