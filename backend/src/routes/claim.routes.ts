import { Router } from 'express';
import { claimController } from '../controllers/claim.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { createClaimSchema, updateClaimStatusSchema } from '../validators/claim.validator';

export const claimRouter = Router();

claimRouter.use(authenticateToken);

claimRouter.post(
  '/',
  validateRequest({ body: createClaimSchema }),
  (req, res, next) => claimController.createClaim(req, res, next)
);

claimRouter.get('/', (req, res, next) => claimController.getUserClaims(req, res, next));

claimRouter.get('/:id', (req, res, next) => claimController.getClaimById(req, res, next));

claimRouter.patch(
  '/:id/status',
  validateRequest({ body: updateClaimStatusSchema }),
  (req, res, next) => claimController.updateClaimStatus(req, res, next)
);

