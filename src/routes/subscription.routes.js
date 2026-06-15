// Routes abonnements /api/v1/subscriptions
const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/admin');
const { subscriptionLimiter } = require('../middlewares/rateLimiter');
const ctrl = require('../controllers/subscription.controller');

// Routeur des abonnements (/api/v1/subscriptions).
const router = Router();

router.use(subscriptionLimiter);

router.get('/me', authenticate, ctrl.getMySubscription);
router.post('/', authenticate, ctrl.createSubscription);

router.get('/admin/pending', authenticate, requireAdmin, ctrl.listPending);
router.put('/admin/:id/approve', authenticate, requireAdmin, ctrl.approveSubscription);
router.put('/admin/:id/reject', authenticate, requireAdmin, ctrl.rejectSubscription);

module.exports = router;
