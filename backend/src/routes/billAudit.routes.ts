import { Router } from 'express';
import { billAuditController } from '../controllers/billAudit.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { billAuditSchema } from '../validators/additional.validator';

export const billAuditRouter = Router();

billAuditRouter.use(authenticateToken);

billAuditRouter.post(
  '/',
  validateRequest({ body: billAuditSchema }),
  (req, res, next) => billAuditController.performAudit(req, res, next)
);

billAuditRouter.get('/:id', (req, res, next) => billAuditController.getAuditById(req, res, next));

