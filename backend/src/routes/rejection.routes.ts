import { Router } from 'express';
import { rejectionController } from '../controllers/rejection.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { recordRejectionSchema } from '../validators/additional.validator';

export const rejectionRouter = Router();

rejectionRouter.use(authenticateToken);

rejectionRouter.post(
  '/record',
  validateRequest({ body: recordRejectionSchema }),
  (req, res, next) => rejectionController.recordRejection(req, res, next)
);

rejectionRouter.get('/claim/:claimId', (req, res, next) =>
  rejectionController.getRejectionByClaimId(req, res, next)
);

