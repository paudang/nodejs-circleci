import request from 'supertest';

const SERVER_URL = process.env.TEST_URL || `http://127.0.0.1:${process.env.PORT || 3001}`;

describe('E2E User Tests', () => {
  let userId: string;
  const uniqueEmail = `test_${Date.now()}@example.com`;

  it('should create a user successfully (Signup)', async () => {
    const response = await request(SERVER_URL)
      .post('/api/users')
      .send({ name: 'Test User', email: uniqueEmail });

    expect([201, 202]).toContain(response.statusCode);
    userId = response.body.id || response.body._id;
  });

  it('should fetch users successfully', async () => {
    const response = await request(SERVER_URL).get('/api/users');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should update a user successfully', async () => {
    const response = await request(SERVER_URL)
      .patch(`/api/users/${userId}`)
      .send({ name: 'Updated User' });

    expect([200, 202, 204]).toContain(response.statusCode);
  });

  it('should delete a user successfully', async () => {
    const response = await request(SERVER_URL).delete(`/api/users/${userId}`);
    expect([200, 202, 204]).toContain(response.statusCode);
  });
});
