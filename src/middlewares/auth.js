// Vérifie le jeton Bearer via auth-service:3001
const authClient = require('../services/authClient');
const { UnauthorizedError } = require('../utils/errors');

// Vérifie le token JWT via Auth-service port 3001.
async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token manquant');
    }

    const token = header.split(' ')[1];
    const result = await authClient.validateToken(token);

    if (!result.valid) {
      throw new UnauthorizedError(result.error || 'Token invalide');
    }

    req.user = result.user;
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    next(new UnauthorizedError('Token invalide ou expiré'));
  }
}

module.exports = { authenticate };
