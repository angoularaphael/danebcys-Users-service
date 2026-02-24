const http = require('http');
const https = require('https');
const env = require('../config/env');

/**
 * Client HTTP natif pour appeler le Auth Service.
 * Pas d'axios, pas de node-fetch — uniquement http/https natifs.
 * Toutes les requêtes sont authentifiées via X-Service-Key.
 */
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

async function validateToken(accessToken) {
  return callAuth('POST', '/internal/validate-token', { accessToken });
}

async function getUser(userId) {
  return callAuth('GET', `/internal/users/${userId}`);
}

async function updateUser(userId, data) {
  return callAuth('PUT', `/internal/users/${userId}`, data);
}

async function listUsers(queryParams = {}) {
  const clean = {};
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  }
  const qs = new URLSearchParams(clean).toString();
  return callAuth('GET', `/internal/users${qs ? '?' + qs : ''}`);
}

async function updateUserRole(userId, roleId) {
  return callAuth('PUT', `/internal/users/${userId}/role`, { roleId });
}

async function updateUserPremium(userId, premiumLevel, studentProof) {
  return callAuth('PUT', `/internal/users/${userId}/premium`, { premiumLevel, studentProof });
}

async function softDeleteUser(userId) {
  return callAuth('DELETE', `/internal/users/${userId}`);
}

async function restoreUser(userId) {
  return callAuth('PUT', `/internal/users/${userId}/restore`);
}

async function getRoles() {
  return callAuth('GET', '/internal/roles');
}

module.exports = {
  validateToken, getUser, updateUser, listUsers,
  updateUserRole, updateUserPremium, softDeleteUser, restoreUser, getRoles
};
