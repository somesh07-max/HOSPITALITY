import request from 'supertest';
import app from '../../src/app';

describe('Health Check API', () => {
  it('GET /health returns 200 and valid health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
    expect(res.body.data.version).toBe('1.0.0');
    expect(res.body.data).toHaveProperty('database');
  });

  it('GET / returns 200 welcome info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toContain('HOSPITALITY');
  });

  it('GET /undefined-route returns 404 NOT_FOUND error envelope', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

