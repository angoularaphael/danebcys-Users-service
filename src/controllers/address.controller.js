// Contrôleurs HTTP : gestion des adresses de livraison
const addressService = require('../services/address.service');

// Liste toutes les adresses actives de l'utilisateur authentifié (PostgreSQL local).
async function listAddresses(req, res, next) {
  try {
    const addresses = await addressService.listAddresses(req.user.id);
    res.json({ addresses });
  } catch (err) {
    next(err);
  }
}

// Récupère une adresse par son identifiant pour l'utilisateur authentifié.
async function getAddress(req, res, next) {
  try {
    const address = await addressService.getAddress(req.user.id, req.params.id);
    res.json({ address });
  } catch (err) {
    next(err);
  }
}

// Crée une nouvelle adresse de livraison pour l'utilisateur authentifié.
async function createAddress(req, res, next) {
  try {
    const address = await addressService.createAddress(req.user.id, req.body);
    res.status(201).json({ address });
  } catch (err) {
    next(err);
  }
}

// Met à jour une adresse existante de l'utilisateur authentifié.
async function updateAddress(req, res, next) {
  try {
    const address = await addressService.updateAddress(req.user.id, req.params.id, req.body);
    res.json({ address });
  } catch (err) {
    next(err);
  }
}

// Supprime (soft delete) une adresse de l'utilisateur authentifié.
async function deleteAddress(req, res, next) {
  try {
    await addressService.deleteAddress(req.user.id, req.params.id);
    res.json({ message: 'Adresse supprimée' });
  } catch (err) {
    next(err);
  }
}

// Définit une adresse comme adresse par défaut de l'utilisateur authentifié.
async function setDefault(req, res, next) {
  try {
    const address = await addressService.setDefault(req.user.id, req.params.id);
    res.json({ address, message: 'Adresse par défaut mise à jour' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAddresses, getAddress, createAddress, updateAddress, deleteAddress, setDefault };
