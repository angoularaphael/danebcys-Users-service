const { Router } = require('express');
const crypto = require('crypto');
const env = require('../config/env');
const http = require('http');
const https = require('https');

const router = Router();
const FAVORITES_URL = process.env.FAVORITES_SERVICE_URL || 'http://localhost:3009';

function serviceAuth(req, res, next) {
  const key = req.headers['x-service-key'];
  if (!key) return res.status(401).json({ error: 'Header X-Service-Key manquant' });

  const hashA = crypto.createHash('sha256').update(String(key)).digest();
  const hashB = crypto.createHash('sha256').update(String(env.INTER_SERVICE_KEY)).digest();

  if (!crypto.timingSafeEqual(hashA, hashB)) {
    return res.status(403).json({ error: 'Clé de service invalide' });
  }

  req.isService = true;
  next();
}

function proxyToFavorites(req, res, path) {
  const url = new URL(FAVORITES_URL);
  const transport = url.protocol === 'https:' ? https : http;
  const opts = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: '/internal/favorites' + path,
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'X-Service-Key': env.INTER_SERVICE_KEY }
  };

  const r = transport.request(opts, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      try {
        res.status(response.statusCode).json(JSON.parse(data));
      } catch (_e) {
        res.status(500).json({ error: 'Réponse invalide' });
      }
    });
  });
  r.on('error', (e) => res.status(503).json({ error: `Favorites Service: ${e.message}` }));
  r.setTimeout(5000, () => { r.destroy(); res.status(503).json({ error: 'Timeout' }); });
  r.end();
}

router.use(serviceAuth);

router.get('/favorites/:userId/count', (req, res) => {
  proxyToFavorites(req, res, `/${req.params.userId}/count`);
});

router.get('/favorites/:userId/:adId', (req, res) => {
  proxyToFavorites(req, res, `/${req.params.userId}/${req.params.adId}`);
});

module.exports = router;
