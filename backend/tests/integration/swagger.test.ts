import request from 'supertest';
import app from '../../src/app';

describe('Swagger Documentation Endpoints', () => {
  it('GET /api/v1/docs.json returns valid OpenAPI 3.0 specification', async () => {
    const res = await request(app).get('/api/v1/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info.title).toContain('HOSPITALITY');
    expect(res.body.paths).toHaveProperty('/auth/register');
    expect(res.body.paths).toHaveProperty('/rules/evaluate');
    expect(res.body.paths).toHaveProperty('/rules/proportionate-deduction');
    expect(res.body.paths).toHaveProperty('/claims');
    expect(res.body.paths).toHaveProperty('/bill-audits');
  });

  it('GET /api/v1/docs/ serves HTML Swagger UI', async () => {
    const res = await request(app).get('/api/v1/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});

