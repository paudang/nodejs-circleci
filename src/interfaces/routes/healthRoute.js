const express = require('express');
const router = express.Router();
const logger = require('../../infrastructure/log/logger');
const HTTP_STATUS = require('../../utils/httpCodes');
const ERROR_MESSAGES = require('../../utils/errorMessages');
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  const healthData = {
    status: 'UP',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'disconnected',
    timestamp: Date.now(),
  };
  logger.info('Health Check');

  try {
    if (mongoose.connection.readyState === 1) {
      if (mongoose.connection.db && mongoose.connection.db.admin) {
        await mongoose.connection.db.admin().ping();
      }
      healthData.database = 'connected';
    }
  } catch (err) {
    healthData.database = 'error';
    healthData.status = 'DOWN';
    logger.error(`${ERROR_MESSAGES.DATABASE_PING_FAILED}:`, err);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(healthData);
  }

  res.status(HTTP_STATUS.OK).json(healthData);
});

module.exports = router;
