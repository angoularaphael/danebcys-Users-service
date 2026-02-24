const authClient = require('../services/authClient');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Middleware d'authentification.
 * Valide le token via le Auth Service (appel HTTP interne).
 * Place req.user = { id, email, username, role }
 */
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
