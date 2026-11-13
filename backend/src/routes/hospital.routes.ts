import { Router } from 'express';
import { hospitalController } from '../controllers/hospital.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { hospitalQuerySchema } from '../validators/claim.validator';

export const hospitalRouter = Router();

hospitalRouter.use(authenticateToken);

hospitalRouter.get(
  '/',
  validateRequest({ query: hospitalQuerySchema }),
  (req, res, next) => hospitalController.searchHospitals(req, res, next)
);

hospitalRouter.get('/:id', (req, res, next) => hospitalController.getHospitalById(req, res, next));

