import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import {
  createReviewSchema,
  reviewQuerySchema,
  moderateReviewSchema
} from '../validators/additional.validator';

export const reviewRouter = Router();

// Public review reading
reviewRouter.get(
  '/',
  validateRequest({ query: reviewQuerySchema }),
  (req, res, next) => reviewController.getReviews(req, res, next)
);

reviewRouter.get('/stats', (req, res, next) => reviewController.getReviewStats(req, res, next));

// Authenticated review submission
reviewRouter.post(
  '/',
  authenticateToken,
  validateRequest({ body: createReviewSchema }),
  (req, res, next) => reviewController.createReview(req, res, next)
);

reviewRouter.post(
  '/:id/report',
  authenticateToken,
  (req, res, next) => reviewController.reportReview(req, res, next)
);

// Admin moderation
reviewRouter.patch(
  '/:id/moderate',
  authenticateToken,
  requireRole('admin'),
  validateRequest({ body: moderateReviewSchema }),
  (req, res, next) => reviewController.moderateReview(req, res, next)
);

