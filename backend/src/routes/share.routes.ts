import { Router } from 'express';
import { shareController } from '../controllers/share.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { createShareLinkSchema } from '../validators/additional.validator';

export const shareRouter = Router();

// Authenticated link creation & revocation
shareRouter.post(
  '/',
  authenticateToken,
  validateRequest({ body: createShareLinkSchema }),
  (req, res, next) => shareController.createShareLink(req, res, next)
);

shareRouter.delete(
  '/:id',
  authenticateToken,
  (req, res, next) => shareController.revokeShareLink(req, res, next)
);

