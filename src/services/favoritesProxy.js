const http = require('http');
const https = require('https');
const env = require('../config/env');

const FAVORITES_URL = process.env.FAVORITES_SERVICE_URL || 'http://localhost:3009';

function proxy(method, path, authHeader) {
  return new Promise((resolve, reject) => {
    const url = new URL(FAVORITES_URL);
    const transport = url.protocol === 'https:' ? https : http;

    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (authHeader) opts.headers['Authorization'] = authHeader;

    const req = transport.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const err = new Error(parsed.error || 'Favorites Service error');
            err.statusCode = res.statusCode;
            return reject(err);
          }
          resolve(parsed);
        } catch (_e) {
          reject(new Error('Réponse invalide'));
        }
      });
    });
    req.on('error', (e) => reject(new Error(`Favorites Service: ${e.message}`)));
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function listFavorites(authHeader, query = '') {
  return proxy('GET', `/api/v1/favorites${query ? '?' + query : ''}`, authHeader);
}

async function countFavorites(authHeader) {
  return proxy('GET', '/api/v1/favorites/count', authHeader);
}

async function checkFavorite(authHeader, adId) {
  return proxy('GET', `/api/v1/favorites/${adId}/check`, authHeader);
}

async function addFavorite(authHeader, adId) {
  return proxy('POST', `/api/v1/favorites/${adId}`, authHeader);
}

async function removeFavorite(authHeader, adId) {
  return proxy('DELETE', `/api/v1/favorites/${adId}`, authHeader);
}

module.exports = { listFavorites, countFavorites, checkFavorite, addFavorite, removeFavorite };
