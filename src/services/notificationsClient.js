// Client HTTP vers Communication-service:3006 pour les notifications
const http = require('http');
const https = require('https');
const env = require('../config/env');

// Appelle Communication-service port 3006 pour envoyer une notification.
function callNotifications(userId, type, message) {
  return new Promise((resolve, reject) => {
    const baseUrl = env.NOTIFICATIONS_SERVICE_URL;
    if (!baseUrl) return reject(new Error('NOTIFICATIONS_SERVICE_URL non configuré'));

    const url = new URL(baseUrl + '/internal/notifications');
    const transport = url.protocol === 'https:' ? https : http;

    const body = JSON.stringify({ userId, type, message });
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Service-Key': env.INTER_SERVICE_KEY
      }
    };

    const req = transport.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          try {
            const parsed = JSON.parse(data);
            return reject(new Error(parsed.error || 'Notifications error'));
          } catch (_e) {
            return reject(new Error('Notifications error'));
          }
        }
        resolve({ created: true });
      });
    });

    req.on('error', (e) => reject(new Error(`Notifications: ${e.message}`)));
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

// Envoie une notification sans bloquer ; les erreurs sont loguées.
async function send(userId, type, message) {
  try {
    await callNotifications(userId, type, message);
  } catch (err) {
    console.error('[notificationsClient]', err.message);
  }
}

module.exports = { send };
