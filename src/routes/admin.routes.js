// Routes admin /api/v1/users/admin
const { Router } = require('express');
const adminCtrl = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth');
const { userLimiter } = require('../middlewares/rateLimiter');
const { requireAdmin } = require('../middlewares/admin');

// Routeur des endpoints d'administration (/api/v1/users/admin).
const router = Router();

router.use(authenticate, userLimiter, requireAdmin);

// ─── Gestion des rôles ─────────────────────────────────────────────
router.get('/roles', adminCtrl.getRoles);

// ─── Gestion des utilisateurs ───────────────────────────────────────
router.get('/users', adminCtrl.listUsers);
router.get('/users/:id', adminCtrl.getUser);
router.put('/users/:id/role', adminCtrl.updateUserRole);
router.delete('/users/:id', adminCtrl.deleteUser);
router.put('/users/:id/restore', adminCtrl.restoreUser);

// ─── Gestion des abonnements (fusionnés localement depuis Subscriptions-service) ──
router.get('/subscriptions/pending', adminCtrl.listPendingSubscriptions);
router.put('/subscriptions/:id/approve', adminCtrl.approveSubscription);
router.put('/subscriptions/:id/reject', adminCtrl.rejectSubscription);

module.exports = router;
