import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateToken } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/auth.validator';

export const authRouter = Router();

authRouter.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  (req, res, next) => authController.register(req, res, next)
);

authRouter.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  (req, res, next) => authController.login(req, res, next)
);

authRouter.get(
  '/me',
  authenticateToken,
  (req, res, next) => authController.getMe(req, res, next)
);

authRouter.patch(
  '/profile',
  authenticateToken,
  validateRequest({ body: updateProfileSchema }),
  (req, res, next) => authController.updateProfile(req, res, next)
);

