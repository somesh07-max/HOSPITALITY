import { hashPassword, comparePassword, generateToken, verifyToken } from '../../src/utils/auth';
import { registerSchema, loginSchema } from '../../src/validators/auth.validator';
import { authenticateToken, requireRole } from '../../src/middleware/auth';
import { AuthenticatedRequest } from '../../src/types';

describe('Auth Utilities and Validators Unit Tests', () => {
  describe('Password Hashing', () => {
    it('hashes passwords securely with bcrypt', async () => {
      const password = 'StrongPassword123!';
      const hash = await hashPassword(password);
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await comparePassword('WrongPassword!', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Token Handling', () => {
    it('generates and verifies JWT tokens with proper claims', () => {
      const mockUser = {
        id: 'user_12345',
        email: 'doctor@example.com',
        role: 'user' as const,
        name: 'Dr. Sharma'
      };

      const token = generateToken(mockUser);
      expect(typeof token).toBe('string');

      const verified = verifyToken(token);
      expect(verified.id).toBe(mockUser.id);
      expect(verified.email).toBe(mockUser.email);
      expect(verified.role).toBe(mockUser.role);
    });

    it('throws error when token is invalid', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });
  });

  describe('Zod Validation Schemas', () => {
    it('validates correct registration payload', () => {
      const valid = {
        name: 'Rajesh Verma',
        email: 'rajesh@example.com',
        password: 'Password123',
        role: 'user'
      };
      const parsed = registerSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects weak passwords or invalid emails', () => {
      const weakPassword = {
        name: 'Rajesh Verma',
        email: 'rajesh@example.com',
        password: 'simple'
      };
      const parsedWeak = registerSchema.safeParse(weakPassword);
      expect(parsedWeak.success).toBe(false);

      const invalidEmail = {
        name: 'Rajesh Verma',
        email: 'not-an-email',
        password: 'Password123'
      };
      const parsedEmail = registerSchema.safeParse(invalidEmail);
      expect(parsedEmail.success).toBe(false);
    });

    it('validates login payload', () => {
      const valid = { email: 'user@hospitality.org', password: 'secretPassword1' };
      expect(loginSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('Auth Middleware', () => {
    it('rejects requests without authorization header with 401', () => {
      const req = { headers: {} } as AuthenticatedRequest;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;
      const next = jest.fn();

      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows requests with valid bearer token', () => {
      const mockUser = {
        id: '65f1a2b3c4d5e6f7a8b9c0d1',
        email: 'admin@hospitality.org',
        role: 'admin' as const,
        name: 'Admin User'
      };
      const token = generateToken(mockUser);

      const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
      const res = {} as any;
      const next = jest.fn();

      authenticateToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user?.id).toBe(mockUser.id);
      expect(req.user?.role).toBe('admin');
    });

    it('requireRole allows permitted role and forbids unpermitted role', () => {
      const adminReq = {
        user: { id: '1', email: 'a@a.com', role: 'admin' as const, name: 'Admin' }
      } as AuthenticatedRequest;
      const userReq = {
        user: { id: '2', email: 'u@u.com', role: 'user' as const, name: 'User' }
      } as AuthenticatedRequest;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      const adminGuard = requireRole('admin');
      const nextAdmin = jest.fn();
      adminGuard(adminReq, res, nextAdmin);
      expect(nextAdmin).toHaveBeenCalled();

      const nextUser = jest.fn();
      adminGuard(userReq, res, nextUser);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(nextUser).not.toHaveBeenCalled();
    });
  });
});

