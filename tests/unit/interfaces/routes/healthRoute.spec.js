const request = require('supertest');
const express = require('express');
const healthRoute = require('@/interfaces/routes/healthRoute');
const HTTP_STATUS = require('@/utils/httpCodes');

jest.mock('mongoose', () => {
  return {
    connection: {
      readyState: 1,
      db: {
        admin: jest.fn().mockReturnValue({
          ping: jest.fn().mockResolvedValue(true),
        }),
      },
    },
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

  it('should handle database ping failure and return 500', async () => {
    const mongoose = require('mongoose');
    mongoose.connection.db.admin.mockReturnValueOnce({
      ping: jest.fn().mockRejectedValueOnce(new Error('DB Error')),
    });

    const res = await request(app).get('/health');
    expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(res.body.status).toBe('DOWN');
    expect(res.body.database).toBe('error');
  });
});
