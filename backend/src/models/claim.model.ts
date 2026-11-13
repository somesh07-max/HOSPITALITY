import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import {
  CLAIM_STAGES,
  ClaimStage,
  STATUS_SOURCES,
  StatusSource
} from '../constants';

export interface IStageHistoryItem {
  stage: ClaimStage;
  timestamp: Date;
  updatedBy: Types.ObjectId;
  remarks?: string;
  source: StatusSource;
  approvedAmount?: number;
}

export interface IClaim extends Document {
  claimNumber: string;
  userId: Types.ObjectId;
  policyId: Types.ObjectId;
  hospitalId?: Types.ObjectId;
  claimType: 'CASHLESS' | 'REIMBURSEMENT';
  currentStage: ClaimStage;
  statusSource: StatusSource;
  claimedAmount: number;
  approvedAmount?: number;
  settledAmount?: number;
  admissionDate?: Date;
  dischargeDate?: Date;
  diseaseOrDiagnosis?: string;
  stageHistory: IStageHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

const StageHistorySchema = new Schema<IStageHistoryItem>(
  {
    stage: {
      type: String,
      enum: Object.values(CLAIM_STAGES),
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: { type: String },
    source: {
      type: String,
      enum: Object.values(STATUS_SOURCES),
      default: STATUS_SOURCES.USER_REPORTED
    },
    approvedAmount: { type: Number }
  },
  { _id: false }
);

const ClaimSchema = new Schema<IClaim>(
  {
    claimNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    policyId: {
      type: Schema.Types.ObjectId,
      ref: 'Policy',
      required: true,
      index: true
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      index: true
    },
    claimType: {
      type: String,
      enum: ['CASHLESS', 'REIMBURSEMENT'],
      default: 'CASHLESS'
    },
    currentStage: {
      type: String,
      enum: Object.values(CLAIM_STAGES),
      default: CLAIM_STAGES.POLICY_CONFIRMED,
      index: true
    },
    statusSource: {
      type: String,
      enum: Object.values(STATUS_SOURCES),
      default: STATUS_SOURCES.USER_REPORTED
    },
    claimedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, min: 0 },
    settledAmount: { type: Number, min: 0 },
    admissionDate: { type: Date },
    dischargeDate: { type: Date },
    diseaseOrDiagnosis: { type: String, trim: true },
    stageHistory: { type: [StageHistorySchema], default: [] }
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

ClaimSchema.index({ userId: 1, currentStage: 1 });

export const Claim: Model<IClaim> =
  mongoose.models.Claim || mongoose.model<IClaim>('Claim', ClaimSchema);
