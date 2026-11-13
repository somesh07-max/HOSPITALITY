import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import {
  REVIEW_CATEGORIES,
  ReviewCategory,
  REVIEW_VERIFICATION_LEVELS,
  ReviewVerificationLevel,
  MODERATION_STATUSES,
  ModerationStatus
} from '../constants';

export interface IReview extends Document {
  userId: Types.ObjectId;
  insurerName: string;
  policyName?: string;
  category: ReviewCategory;
  rating: number; // 1 to 5
  reviewText: string;
  experienceDate: Date;
  claimId?: Types.ObjectId;
  verificationStatus: ReviewVerificationLevel;
  moderationStatus: ModerationStatus;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    insurerName: { type: String, required: true, trim: true, index: true },
    policyName: { type: String, trim: true },
    category: {
      type: String,
      enum: Object.values(REVIEW_CATEGORIES),
      required: true,
      index: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true
    },
    reviewText: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 2000,
      trim: true
    },
    experienceDate: { type: Date, required: true },
    claimId: { type: Schema.Types.ObjectId, ref: 'Claim' },
    verificationStatus: {
      type: String,
      enum: Object.values(REVIEW_VERIFICATION_LEVELS),
      default: REVIEW_VERIFICATION_LEVELS.UNVERIFIED,
      index: true
    },
    moderationStatus: {
      type: String,
      enum: Object.values(MODERATION_STATUSES),
      default: MODERATION_STATUSES.APPROVED,
      index: true
    },
    reportCount: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);

ReviewSchema.index({ insurerName: 1, moderationStatus: 1, rating: -1 });

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

