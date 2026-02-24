const { Router } = require('express');
const adminCtrl = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth');
const { userLimiter } = require('../middlewares/rateLimiter');
const { requireAdmin } = require('../middlewares/admin');

const router = Router();

router.use(authenticate, userLimiter, requireAdmin);

// ─── Gestion des rôles ─────────────────────────────────────────────
router.get('/roles', adminCtrl.getRoles);

// ─── Gestion des utilisateurs ───────────────────────────────────────
router.get('/users', adminCtrl.listUsers);
router.get('/users/:id', adminCtrl.getUser);
router.put('/users/:id/role', adminCtrl.updateUserRole);
router.put('/users/:id/premium', adminCtrl.updateUserPremium);
router.delete('/users/:id', adminCtrl.deleteUser);
router.put('/users/:id/restore', adminCtrl.restoreUser);

module.exports = router;
