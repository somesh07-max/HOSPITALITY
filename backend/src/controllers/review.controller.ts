import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { reviewService } from '../services/review.service';
import { sendSuccess } from '../utils/response';

export class ReviewController {
  async createReview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await reviewService.createReview(req.user!.id, req.body);
      sendSuccess(res, 201, review, 'Review submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reviewService.getReviews(req.query as any);
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  async getReviewStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const insurerName = req.query.insurerName as string;
      const stats = await reviewService.getReviewStats(insurerName);
      sendSuccess(res, 200, stats);
    } catch (error) {
      next(error);
    }
  }

  async reportReview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await reviewService.reportReview(req.params.id);
      sendSuccess(res, 200, { reported: true }, 'Review flagged for moderation');
    } catch (error) {
      next(error);
    }
  }

  async moderateReview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await reviewService.moderateReview(req.params.id, req.body.moderationStatus);
      sendSuccess(res, 200, updated, 'Review moderation updated');
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();

