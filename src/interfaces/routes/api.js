const express = require('express');
const UserController = require('../controllers/userController');
const authMiddleware = require('../../infrastructure/webserver/middleware/authMiddleware');
const router = express.Router();
const userController = new UserController();

router.get('/users', authMiddleware, (req, res, next) => userController.getUsers(req, res, next));
router.get('/users/:id', authMiddleware, (req, res, next) =>
  userController.getUserById(req, res, next),
);
router.post('/users', (req, res, next) => userController.createUser(req, res, next));
router.patch('/users/:id', authMiddleware, (req, res, next) =>
  userController.updateUser(req, res, next),
);
router.delete('/users/:id', authMiddleware, (req, res, next) =>
  userController.deleteUser(req, res, next),
);

module.exports = router;
