const request = require('supertest');
const express = require('express');
const healthRoute = require('@/interfaces/routes/healthRoute');
const HTTP_STATUS = require('@/utils/httpCodes');

jest.mock('@/infrastructure/database/database', () => {
  return {
    authenticate: jest.fn(),
  };
});

describe('Health Route', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use('/health', healthRoute);
    jest.clearAllMocks();
  });

  it('should return 200 OK with UP status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body.status).toBe('UP');
    expect(res.body.database).toBe('connected');
  });

  it('should handle database authentication failure and return 500', async () => {
    const sequelize = require('@/infrastructure/database/database');
    sequelize.authenticate.mockRejectedValueOnce(new Error('DB Error'));

    const res = await request(app).get('/health');
    expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(res.body.status).toBe('DOWN');
    expect(res.body.database).toBe('error');
  });
});
