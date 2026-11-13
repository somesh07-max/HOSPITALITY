import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { billAuditService } from '../services/billAudit.service';
import { sendSuccess } from '../utils/response';

export class BillAuditController {
  async performAudit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const audit = await billAuditService.performAudit(req.user!.id, req.body);
      sendSuccess(res, 201, audit, 'Bill audit completed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAuditById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'admin';
      const audit = await billAuditService.getAuditById(req.params.id, req.user!.id, isAdmin);
      sendSuccess(res, 200, audit);
    } catch (error) {
      next(error);
    }
  }
}

export const billAuditController = new BillAuditController();

