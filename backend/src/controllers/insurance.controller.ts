import { Request, Response, NextFunction } from 'express';
import { findInsuranceService } from '../services/findInsurance.service';
import { sendSuccess } from '../utils/response';

export class InsuranceController {
  async comparePolicies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await findInsuranceService.compareAndRank(req.body);
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  async getProviders(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const providers = await findInsuranceService.getProviders();
      sendSuccess(res, 200, providers);
    } catch (error) {
      next(error);
    }
  }

  async getPolicies(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const policies = await findInsuranceService.getAllProducts();
      sendSuccess(res, 200, policies);
    } catch (error) {
      next(error);
    }
  }
}

export const insuranceController = new InsuranceController();

