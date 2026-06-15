// Client HTTP vers Orders-service:3005
const http = require('http');
const https = require('https');
const env = require('../config/env');

// URL du Orders-service port 3005.
const ORDERS_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:3005';

// Appelle Orders-service port 3005 avec la clé inter-services.
function callOrders(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(ORDERS_URL);
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
            const err = new Error(parsed.error || `Orders Service ${res.statusCode}`);
            err.statusCode = res.statusCode;
            return reject(err);
          }
          resolve(parsed);
        } catch (_e) {
          reject(new Error('Réponse invalide du Orders Service'));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Orders Service injoignable: ${err.message}`)));
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Orders Service timeout (5s)'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Récupère les commandes paginées d'un utilisateur — orders-service:3005 GET /internal/orders/user/:userId.
async function getUserOrders(userId, page = 1, limit = 20) {
  return callOrders('GET', `/internal/orders/user/${userId}?page=${page}&limit=${limit}`);
}

module.exports = { getUserOrders };
