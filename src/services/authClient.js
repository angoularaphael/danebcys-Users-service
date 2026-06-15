// Client HTTP vers auth-service:3001 (utilisateurs, validation token)
const http = require('http');
const https = require('https');
const env = require('../config/env');

// Appelle Auth-service port 3001 avec la clé inter-services.
function callAuth(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(env.AUTH_SERVICE_URL);
    const transport = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': env.INTER_SERVICE_KEY
      }
    };

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const err = new Error(parsed.error || `Auth Service ${res.statusCode}`);
            err.statusCode = res.statusCode;
            return reject(err);
          }
          resolve(parsed);
        } catch (_e) {
          reject(new Error('Réponse invalide du Auth Service'));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Auth Service injoignable: ${err.message}`)));
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Auth Service timeout (5s)'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Valide un token JWT — auth-service:3001 POST /internal/validate-token.
async function validateToken(accessToken) {
  return callAuth('POST', '/internal/validate-token', { accessToken });
}

// Récupère un utilisateur par ID — auth-service:3001 GET /internal/users/:id.
async function getUser(userId) {
  return callAuth('GET', `/internal/users/${userId}`);
}

// Met à jour les champs profil d'un utilisateur — auth-service:3001 PUT /internal/users/:id.
async function updateUser(userId, data) {
  return callAuth('PUT', `/internal/users/${userId}`, data);
}

// Liste paginée des utilisateurs — auth-service:3001 GET /internal/users.
async function listUsers(queryParams = {}) {
  const clean = {};
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  }
  const qs = new URLSearchParams(clean).toString();
  return callAuth('GET', `/internal/users${qs ? '?' + qs : ''}`);
}

// Modifie le rôle d'un utilisateur — auth-service:3001 PUT /internal/users/:id/role.
async function updateUserRole(userId, roleId) {
  return callAuth('PUT', `/internal/users/${userId}/role`, { roleId });
}

// Met à jour le niveau premium d'un utilisateur — auth-service:3001 PUT /internal/users/:id/premium.
async function updateUserPremium(userId, premiumLevel, studentProof) {
  return callAuth('PUT', `/internal/users/${userId}/premium`, { premiumLevel, studentProof });
}

// Suppression logique d'un utilisateur — auth-service:3001 DELETE /internal/users/:id.
async function softDeleteUser(userId) {
  return callAuth('DELETE', `/internal/users/${userId}`);
}

// Restaure un utilisateur supprimé — auth-service:3001 PUT /internal/users/:id/restore.
async function restoreUser(userId) {
  return callAuth('PUT', `/internal/users/${userId}/restore`);
}

// Liste tous les rôles disponibles — auth-service:3001 GET /internal/roles.
async function getRoles() {
  return callAuth('GET', '/internal/roles');
}

// Récupère les utilisateurs ayant un rôle donné — auth-service:3001 GET /internal/users?role=...
async function getUsersByRole(role) {
  const path = `/internal/users?role=${encodeURIComponent(role)}&limit=100`;
  const res = await callAuth('GET', path);
  return res.users || [];
}

module.exports = {
  validateToken, getUser, updateUser, listUsers,
  updateUserRole, updateUserPremium, softDeleteUser, restoreUser, getRoles,
  getUsersByRole
};
