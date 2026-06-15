// Proxy des notifications vers Communication-service
const http = require('http');
const https = require('https');

// URL du Communication-service port 3006.
const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3006';

// Redirige une requête vers Communication-service port 3006.
function proxy(method, path, authHeader, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(NOTIFICATIONS_URL);
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
            const err = new Error(parsed.error || 'Notifications Service error');
            err.statusCode = res.statusCode;
            return reject(err);
          }
          resolve(parsed);
        } catch (_e) {
          reject(new Error('Réponse invalide'));
        }
      });
    });
    req.on('error', (e) => reject(new Error(`Notifications Service: ${e.message}`)));
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Liste les notifications de l'utilisateur — communication-service:3006 GET /api/v1/notifications.
async function listNotifications(authHeader, query = '') {
  return proxy('GET', `/api/v1/notifications${query ? '?' + query : ''}`, authHeader);
}

// Retourne le nombre de notifications non lues — communication-service:3006 GET /api/v1/notifications/unread/count.
async function getUnreadCount(authHeader) {
  return proxy('GET', '/api/v1/notifications/unread/count', authHeader);
}

// Marque toutes les notifications comme lues — communication-service:3006 PUT /api/v1/notifications/read-all.
async function markAllAsRead(authHeader) {
  return proxy('PUT', '/api/v1/notifications/read-all', authHeader);
}

// Marque une notification comme lue — communication-service:3006 PUT /api/v1/notifications/:id/read.
async function markAsRead(authHeader, notificationId) {
  return proxy('PUT', `/api/v1/notifications/${notificationId}/read`, authHeader);
}

module.exports = { listNotifications, getUnreadCount, markAllAsRead, markAsRead };
