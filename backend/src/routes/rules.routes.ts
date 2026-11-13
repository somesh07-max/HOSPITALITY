import { Router } from 'express';
import { rulesController } from '../controllers/rules.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import {
  evaluateCoverageSchema,
  proportionateDeductionSchema,
  roomUpgradeSchema
} from '../validators/rules.validator';

export const rulesRouter = Router();

rulesRouter.use(authenticateToken);

rulesRouter.post(
  '/evaluate',
  validateRequest({ body: evaluateCoverageSchema }),
  (req, res, next) => rulesController.evaluateCoverage(req, res, next)
);

rulesRouter.post(
  '/proportionate-deduction',
  validateRequest({ body: proportionateDeductionSchema }),
  (req, res, next) => rulesController.calculateProportionateDeduction(req, res, next)
);

rulesRouter.post(
  '/room-upgrade',
  validateRequest({ body: roomUpgradeSchema }),
  (req, res, next) => rulesController.simulateRoomUpgrade(req, res, next)
);

