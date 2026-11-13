import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { claimService } from '../services/claim.service';
import { sendSuccess } from '../utils/response';

export class ClaimController {
  async createClaim(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const claim = await claimService.createClaim(req.user!.id, req.body);
      sendSuccess(res, 201, claim, 'Claim initiated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUserClaims(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { stage, page, limit } = req.query;
      const result = await claimService.getUserClaims(req.user!.id, {
        stage: stage as any,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20
      });
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  async getClaimById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'admin';
      const claim = await claimService.getClaimById(req.params.id, req.user!.id, isAdmin);
      sendSuccess(res, 200, claim);
    } catch (error) {
      next(error);
    }
  }

  async updateClaimStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'admin';
      const updated = await claimService.updateClaimStatus(
        req.params.id,
        req.user!.id,
        req.body,
        isAdmin
      );
      sendSuccess(res, 200, updated, 'Claim stage updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const claimController = new ClaimController();

