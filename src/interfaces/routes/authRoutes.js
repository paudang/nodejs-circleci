const { Router } = require('express');
const AuthController = require('../controllers/auth/authController');
const authMiddleware = require('../../infrastructure/webserver/middleware/authMiddleware');

const router = Router();
const authController = new AuthController();

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', authMiddleware, (req, res, next) => authController.logout(req, res, next));
router.post('/social/exchange', (req, res, next) => authController.socialExchange(req, res, next));
router.get('/google', (req, res) => authController.googleLogin(req, res));
router.get('/google/callback', (req, res, next) => authController.googleCallback(req, res, next));
router.get('/github', (req, res) => authController.githubLogin(req, res));
router.get('/github/callback', (req, res, next) => authController.githubCallback(req, res, next));

module.exports = router;
