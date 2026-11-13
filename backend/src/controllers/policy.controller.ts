import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { policyService } from '../services/policy.service';
import { sendSuccess } from '../utils/response';

export class PolicyController {
  async createPolicy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const policy = await policyService.createPolicy(req.user!.id, req.body);
      sendSuccess(res, 201, policy, 'Policy created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUserPolicies(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { confirmationStatus, page, limit } = req.query;
      const result = await policyService.getUserPolicies(req.user!.id, {
        confirmationStatus: confirmationStatus as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20
      });
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  async getPolicyById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user!.role === 'admin';
      const policy = await policyService.getPolicyById(req.params.id, req.user!.id, isAdmin);
      sendSuccess(res, 200, policy);
    } catch (error) {
      next(error);
    }
  }

  async updatePolicy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user!.role === 'admin';
      const updated = await policyService.updatePolicy(req.params.id, req.user!.id, req.body, isAdmin);
      sendSuccess(res, 200, updated, 'Policy updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deletePolicy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user!.role === 'admin';
      await policyService.deletePolicy(req.params.id, req.user!.id, isAdmin);
      sendSuccess(res, 200, { deleted: true }, 'Policy deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async confirmPolicy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const confirmed = await policyService.confirmPolicy(req.params.id, req.user!.id, req.body);
      sendSuccess(res, 200, confirmed, 'Policy confirmation status updated');
    } catch (error) {
      next(error);
    }
  }
}

export const policyController = new PolicyController();

