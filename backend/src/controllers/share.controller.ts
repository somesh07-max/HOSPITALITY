import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { shareService } from '../services/share.service';
import { sendSuccess } from '../utils/response';

export class ShareController {
  async createShareLink(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { resourceType, resourceId, expiresInHours } = req.body;
      const result = await shareService.createShareLink(
        req.user!.id,
        resourceType,
        resourceId,
        expiresInHours
      );
      sendSuccess(res, 201, result, 'Secure view-only share link generated');
    } catch (error) {
      next(error);
    }
  }

  async getSharedResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await shareService.getSharedResource(req.params.token);
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  async revokeShareLink(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await shareService.revokeShareLink(req.params.id, req.user!.id);
      sendSuccess(res, 200, { revoked: true }, 'Share link revoked successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const shareController = new ShareController();

