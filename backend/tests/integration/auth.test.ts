import request from 'supertest';
import app from '../../src/app';
import { User } from '../../src/models/user.model';
import { generateToken } from '../../src/utils/auth';

describe('Auth Integration Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('returns 422 if body is invalid', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid-email',
        password: '123'
      });
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('registers user and returns JWT token and user info', async () => {
      const mockCreatedUser = {
        _id: '65f1a2b3c4d5e6f7a8b9c0d1',
        name: 'Sunil Kumar',
        email: 'sunil@example.com',
        role: 'user',
        isActive: true,
        toJSON: function () {
          return {
            id: this._id,
            name: this.name,
            email: this.email,
            role: this.role,
            isActive: this.isActive
          };
        }
      };

      jest.spyOn(User, 'findOne').mockResolvedValue(null as any);
      jest.spyOn(User, 'create').mockResolvedValue(mockCreatedUser as any);

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Sunil Kumar',
        email: 'sunil@example.com',
        password: 'SecurePassword123'
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('sunil@example.com');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('returns 409 if email is already registered', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue({ _id: 'existing' } as any);

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Sunil Kumar',
        email: 'sunil@example.com',
        password: 'SecurePassword123'
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 when token is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns user profile when authenticated', async () => {
      const mockUser = {
        id: '65f1a2b3c4d5e6f7a8b9c0d1',
        email: 'sunil@example.com',
        role: 'user' as const,
        name: 'Sunil Kumar'
      };
      const token = generateToken(mockUser);

      jest.spyOn(User, 'findById').mockResolvedValue({
        ...mockUser,
        toJSON: () => mockUser
      } as any);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('sunil@example.com');
    });
  });
});

