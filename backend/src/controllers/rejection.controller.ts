import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { rejectionService } from '../services/rejection.service';
import { sendSuccess } from '../utils/response';

export class RejectionController {
  async recordRejection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await rejectionService.recordRejection(req.user!.id, req.body);
      sendSuccess(res, 201, record, 'Rejection information recorded and classified');
    } catch (error) {
      next(error);
    }
  }

  async getRejectionByClaimId(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'admin';
      const records = await rejectionService.getRejectionByClaimId(req.params.claimId, req.user!.id, isAdmin);
      sendSuccess(res, 200, records);
    } catch (error) {
      next(error);
    }
  }
}

export const rejectionController = new RejectionController();

