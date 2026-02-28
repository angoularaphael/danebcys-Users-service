const http = require('http');
const https = require('https');

const SUBSCRIPTIONS_URL = process.env.SUBSCRIPTIONS_SERVICE_URL || 'http://localhost:3008';

function proxy(method, path, authHeader, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUBSCRIPTIONS_URL);
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
            const err = new Error(parsed.error || 'Subscriptions Service error');
            err.statusCode = res.statusCode;
            return reject(err);
          }
          resolve(parsed);
        } catch (_e) {
          reject(new Error('Réponse invalide'));
        }
      });
    });
    req.on('error', (e) => reject(new Error(`Subscriptions Service: ${e.message}`)));
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getMySubscription(authHeader) {
  return proxy('GET', '/api/v1/subscriptions/me', authHeader);
}

async function createSubscription(authHeader, body) {
  return proxy('POST', '/api/v1/subscriptions', authHeader, body);
}

async function listPendingSubscriptions(authHeader, query = '') {
  return proxy('GET', `/api/v1/subscriptions/admin/pending${query ? '?' + query : ''}`, authHeader);
}

async function approveSubscription(authHeader, id, body) {
  return proxy('PUT', `/api/v1/subscriptions/admin/${id}/approve`, authHeader, body);
}

async function rejectSubscription(authHeader, id) {
  return proxy('PUT', `/api/v1/subscriptions/admin/${id}/reject`, authHeader);
}

module.exports = {
  getMySubscription,
  createSubscription,
  listPendingSubscriptions,
  approveSubscription,
  rejectSubscription
};
