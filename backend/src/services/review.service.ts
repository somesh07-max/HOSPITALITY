import { Types } from 'mongoose';
import { Review, IReview } from '../models/review.model';
import { Policy } from '../models/policy.model';
import { Claim } from '../models/claim.model';
import { AppError } from '../middleware/errorHandler';
import {
  REVIEW_VERIFICATION_LEVELS,
  ReviewVerificationLevel,
  MODERATION_STATUSES,
  ModerationStatus,
  ReviewCategory
} from '../constants';

export interface CreateReviewInput {
  insurerName: string;
  policyName?: string;
  category: ReviewCategory;
  rating: number;
  reviewText: string;
  experienceDate: Date | string;
  claimId?: string;
}

export interface ReviewQueryOptions {
  insurerName?: string;
  category?: ReviewCategory;
  rating?: number;
  verificationStatus?: ReviewVerificationLevel;
  page?: number;
  limit?: number;
  includeUnapproved?: boolean;
}

export class ReviewService {
  async createReview(userId: string, input: CreateReviewInput): Promise<IReview> {
    const userObjId = new Types.ObjectId(userId);
    let verificationStatus: ReviewVerificationLevel = REVIEW_VERIFICATION_LEVELS.UNVERIFIED;

    // Check if review has an associated confirmed claim
    if (input.claimId) {
      const claim = await Claim.findOne({
        _id: new Types.ObjectId(input.claimId),
        userId: userObjId
      });
      if (claim) {
        verificationStatus = REVIEW_VERIFICATION_LEVELS.VERIFIED_CLAIM;
      }
    }

    // Check if user has an active confirmed policy with this insurer
    if (verificationStatus === REVIEW_VERIFICATION_LEVELS.UNVERIFIED) {
      const policy = await Policy.findOne({
        userId: userObjId,
        insurerName: { $regex: new RegExp(`^${input.insurerName.trim()}$`, 'i') }
      });
      if (policy) {
        verificationStatus = REVIEW_VERIFICATION_LEVELS.VERIFIED_POLICYHOLDER;
      }
    }

    const review = await Review.create({
      userId: userObjId,
      insurerName: input.insurerName.trim(),
      policyName: input.policyName?.trim(),
      category: input.category,
      rating: Math.min(5, Math.max(1, Math.round(input.rating))),
      reviewText: input.reviewText.trim(),
      experienceDate: new Date(input.experienceDate),
      claimId: input.claimId ? new Types.ObjectId(input.claimId) : undefined,
      verificationStatus,
      moderationStatus: MODERATION_STATUSES.APPROVED,
      reportCount: 0
    });

    return review;
  }

  async getReviews(options: ReviewQueryOptions): Promise<{
    reviews: IReview[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (!options.includeUnapproved) {
      filter.moderationStatus = MODERATION_STATUSES.APPROVED;
    }

    if (options.insurerName) {
      filter.insurerName = { $regex: new RegExp(`^${options.insurerName.trim()}$`, 'i') };
    }

    if (options.category) {
      filter.category = options.category;
    }

    if (options.rating) {
      filter.rating = options.rating;
    }

    if (options.verificationStatus) {
      filter.verificationStatus = options.verificationStatus;
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('userId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter)
    ]);

    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getReviewStats(insurerName?: string): Promise<{
    hasSufficientData: boolean;
    totalReviews: number;
    averageRating?: number;
    categoryRatings?: Record<string, number>;
    ratingDistribution?: Record<number, number>;
    message?: string;
  }> {
    const filter: any = { moderationStatus: MODERATION_STATUSES.APPROVED };
    if (insurerName) {
      filter.insurerName = { $regex: new RegExp(`^${insurerName.trim()}$`, 'i') };
    }

    const reviews = await Review.find(filter);

    if (reviews.length === 0) {
      return {
        hasSufficientData: false,
        totalReviews: 0,
        message: 'Insufficient verified reviews available.'
      };
    }

    const totalReviews = reviews.length;
    const sumRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = parseFloat((sumRatings / totalReviews).toFixed(2));

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const categoryTotals: Record<string, { sum: number; count: number }> = {};

    for (const r of reviews) {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;

      if (!categoryTotals[r.category]) {
        categoryTotals[r.category] = { sum: 0, count: 0 };
      }
      categoryTotals[r.category].sum += r.rating;
      categoryTotals[r.category].count += 1;
    }

    const categoryRatings: Record<string, number> = {};
    for (const [cat, data] of Object.entries(categoryTotals)) {
      categoryRatings[cat] = parseFloat((data.sum / data.count).toFixed(2));
    }

    return {
      hasSufficientData: true,
      totalReviews,
      averageRating,
      categoryRatings,
      ratingDistribution
    };
  }

  async reportReview(reviewId: string): Promise<boolean> {
    const review = await Review.findById(new Types.ObjectId(reviewId));
    if (!review) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }

    review.reportCount += 1;
    if (review.reportCount >= 3) {
      review.moderationStatus = MODERATION_STATUSES.PENDING;
    }
    await review.save();
    return true;
  }

  async moderateReview(reviewId: string, status: ModerationStatus): Promise<IReview> {
    const review = await Review.findById(new Types.ObjectId(reviewId));
    if (!review) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }

    review.moderationStatus = status;
    await review.save();
    return review;
  }
}

export const reviewService = new ReviewService();

