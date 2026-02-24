const { ForbiddenError } = require('../utils/errors');

function requireAdmin(req, _res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ForbiddenError('Accès réservé aux administrateurs'));
  }
  next();
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Accès réservé aux rôles : ${roles.join(', ')}`));
    }
    next();
  };
}

module.exports = { requireAdmin, requireRole };
