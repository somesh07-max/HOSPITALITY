import { Router } from 'express';
import { insuranceController } from '../controllers/insurance.controller';
import { validateRequest } from '../middleware/validateRequest';
import { findInsuranceSchema } from '../validators/additional.validator';

export const insuranceRouter = Router();

insuranceRouter.post(
  '/compare',
  validateRequest({ body: findInsuranceSchema }),
  (req, res, next) => insuranceController.comparePolicies(req, res, next)
);

insuranceRouter.get('/providers', (req, res, next) =>
  insuranceController.getProviders(req, res, next)
);

insuranceRouter.get('/policies', (req, res, next) =>
  insuranceController.getPolicies(req, res, next)
);

