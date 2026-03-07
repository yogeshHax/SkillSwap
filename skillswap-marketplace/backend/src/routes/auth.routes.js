// src/routes/auth.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authRateLimiter } = require('../middleware/rateLimiter.middleware');
const { validate } = require('../middleware/validate.middleware');
const { registerRules, loginRules, refreshRules } = require('../validators/auth.validator');

// POST /api/auth/register
router.post('/register', authRateLimiter, registerRules, validate, ctrl.register);

// POST /api/auth/login
router.post('/login', authRateLimiter, loginRules, validate, ctrl.login);

// POST /api/auth/refresh
router.post('/refresh', refreshRules, validate, ctrl.refresh);

// POST /api/auth/logout  (protected)
router.post('/logout', authenticate, ctrl.logout);

// GET /api/auth/me  (protected)
router.get('/me', authenticate, ctrl.getMe);

module.exports = router;
