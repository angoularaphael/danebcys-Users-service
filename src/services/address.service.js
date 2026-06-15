// Gestion des adresses de livraison (PostgreSQL)
const { query } = require('../config/database');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');

// Liste toutes les adresses actives d'un utilisateur (PostgreSQL, table addresses).
async function listAddresses(userId) {
  const result = await query(
    `SELECT id, label, street, city, zip_code, country, is_default, created_at, updated_at
     FROM addresses
     WHERE user_id = $1 AND deleted = FALSE
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
  return result.rows.map(formatAddress);
}

// Récupère une adresse par ID pour un utilisateur donné.
async function getAddress(userId, addressId) {
  const result = await query(
    `SELECT id, label, street, city, zip_code, country, is_default, created_at, updated_at
     FROM addresses
     WHERE id = $1 AND user_id = $2 AND deleted = FALSE`,
    [addressId, userId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Adresse non trouvée');
  return formatAddress(result.rows[0]);
}

// Crée une nouvelle adresse ; réinitialise les autres si isDefault est true.
async function createAddress(userId, data) {
  const { label, street, city, zipCode, country, isDefault } = data;

  if (!street || !city || !zipCode || !country) {
    throw new BadRequestError('street, city, zipCode et country sont requis');
  }

  if (isDefault) {
    await query(
      `UPDATE addresses SET is_default = FALSE WHERE user_id = $1 AND deleted = FALSE`,
      [userId]
    );
  }

  const result = await query(
    `INSERT INTO addresses (user_id, label, street, city, zip_code, country, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, label, street, city, zip_code, country, is_default, created_at, updated_at`,
    [userId, label || null, street, city, zipCode, country, isDefault || false]
  );

  return formatAddress(result.rows[0]);
}

// Met à jour partiellement une adresse existante.
async function updateAddress(userId, addressId, data) {
  const existing = await query(
    'SELECT id FROM addresses WHERE id = $1 AND user_id = $2 AND deleted = FALSE',
    [addressId, userId]
  );
  if (existing.rows.length === 0) throw new NotFoundError('Adresse non trouvée');

  const { label, street, city, zipCode, country } = data;
  const fields = [];
  const params = [];
  let idx = 1;

  if (label !== undefined) { fields.push(`label = $${idx++}`); params.push(label || null); }
  if (street !== undefined) { fields.push(`street = $${idx++}`); params.push(street); }
  if (city !== undefined) { fields.push(`city = $${idx++}`); params.push(city); }
  if (zipCode !== undefined) { fields.push(`zip_code = $${idx++}`); params.push(zipCode); }
  if (country !== undefined) { fields.push(`country = $${idx++}`); params.push(country); }

  if (fields.length === 0) throw new BadRequestError('Aucun champ à mettre à jour');

  params.push(addressId, userId);

  const result = await query(
    `UPDATE addresses SET ${fields.join(', ')}
     WHERE id = $${idx} AND user_id = $${idx + 1} AND deleted = FALSE
     RETURNING id, label, street, city, zip_code, country, is_default, created_at, updated_at`,
    params
  );

  return formatAddress(result.rows[0]);
}

// Supprime logiquement une adresse (deleted = TRUE).
async function deleteAddress(userId, addressId) {
  const result = await query(
    `UPDATE addresses SET deleted = TRUE WHERE id = $1 AND user_id = $2 AND deleted = FALSE RETURNING id`,
    [addressId, userId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Adresse non trouvée');
}

// Définit une adresse comme adresse par défaut (désactive les autres du même utilisateur).
async function setDefault(userId, addressId) {
  const existing = await query(
    'SELECT id FROM addresses WHERE id = $1 AND user_id = $2 AND deleted = FALSE',
    [addressId, userId]
  );
  if (existing.rows.length === 0) throw new NotFoundError('Adresse non trouvée');

  await query(
    `UPDATE addresses SET is_default = FALSE WHERE user_id = $1 AND deleted = FALSE`,
    [userId]
  );
  const result = await query(
    `UPDATE addresses SET is_default = TRUE WHERE id = $1 AND user_id = $2
     RETURNING id, label, street, city, zip_code, country, is_default, created_at, updated_at`,
    [addressId, userId]
  );

  return formatAddress(result.rows[0]);
}

// Convertit une ligne PostgreSQL en objet adresse au format API (camelCase).
function formatAddress(row) {
  return {
    id: row.id,
    label: row.label,
    street: row.street,
    city: row.city,
    zipCode: row.zip_code,
    country: row.country,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = { listAddresses, getAddress, createAddress, updateAddress, deleteAddress, setDefault };
