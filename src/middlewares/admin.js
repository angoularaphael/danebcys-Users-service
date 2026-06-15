// Vérifie que l'utilisateur connecté a le rôle administrateur
const { ForbiddenError } = require('../utils/errors');

// Middleware : refuse l'accès si l'utilisateur authentifié n'a pas le rôle admin.
// Doit être placé après le middleware authenticate.
function requireAdmin(req, _res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ForbiddenError('Accès réservé aux administrateurs'));
  }
  next();
}

// Fabrique un middleware qui n'autorise que les rôles spécifiés.
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Accès réservé aux rôles : ${roles.join(', ')}`));
    }
    next();
  };
}

module.exports = { requireAdmin, requireRole };
