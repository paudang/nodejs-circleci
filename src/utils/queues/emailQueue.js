const redisClient = require('../../config/redisClient');
const { Queue } = require('bullmq');

const emailQueue = new Queue('email-queue', { connection: redisClient.client });

module.exports = { emailQueue };
