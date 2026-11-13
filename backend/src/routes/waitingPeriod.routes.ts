import { Router } from 'express';
import { rulesController } from '../controllers/rules.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { waitingPeriodCheckSchema } from '../validators/rules.validator';

export const waitingPeriodRouter = Router();

waitingPeriodRouter.use(authenticateToken);

waitingPeriodRouter.post(
  '/check',
  validateRequest({ body: waitingPeriodCheckSchema }),
  (req, res, next) => rulesController.checkWaitingPeriod(req, res, next)
);

