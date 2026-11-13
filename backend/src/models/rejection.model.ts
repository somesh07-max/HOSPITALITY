import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { REJECTION_CATEGORIES, RejectionCategory } from '../constants';

export interface IRejectionRecord extends Document {
  userId: Types.ObjectId;
  claimId: Types.ObjectId;
  policyId: Types.ObjectId;
  claimedAmount: number;
  approvedAmount: number;
  differenceAmount: number;
  rejectionCategory: RejectionCategory;
  insurerRemarks?: string;
  deterministicClassification: {
    title: string;
    explanation: string;
    relevantClauses: string[];
    recommendedAppealActions: string[];
    appealViability: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  preparedForAiContext: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const RejectionSchema = new Schema<IRejectionRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    claimId: { type: Schema.Types.ObjectId, ref: 'Claim', required: true, index: true },
    policyId: { type: Schema.Types.ObjectId, ref: 'Policy', required: true, index: true },
    claimedAmount: { type: Number, required: true },
    approvedAmount: { type: Number, default: 0 },
    differenceAmount: { type: Number, required: true },
    rejectionCategory: {
      type: String,
      enum: Object.values(REJECTION_CATEGORIES),
      required: true
    },
    insurerRemarks: { type: String },
    deterministicClassification: {
      title: { type: String, required: true },
      explanation: { type: String, required: true },
      relevantClauses: { type: [String], default: [] },
      recommendedAppealActions: { type: [String], default: [] },
      appealViability: {
        type: String,
        enum: ['HIGH', 'MEDIUM', 'LOW'],
        default: 'MEDIUM'
      }
    },
    preparedForAiContext: { type: Schema.Types.Mixed, default: {} }
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

export const ClaimRejectionRecord: Model<IRejectionRecord> =
  mongoose.models.ClaimRejectionRecord ||
  mongoose.model<IRejectionRecord>('ClaimRejectionRecord', RejectionSchema);

