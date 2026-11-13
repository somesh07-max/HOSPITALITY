import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import {
  CONFIRMATION_STATUS,
  ConfirmationStatus,
  FIELD_CONFIRMATION_STATUS,
  FieldConfirmationStatus,
  POLICY_TYPES,
  PolicyType,
  VERIFICATION_STATUSES,
  VerificationStatus
} from '../constants';

export interface IMemberCovered {
  name: string;
  relationship: string;
  age: number;
  dob?: Date;
}

export interface IRoomRentLimit {
  limitType: 'PERCENTAGE' | 'FIXED' | 'NO_LIMIT';
  percentage?: number; // e.g., 1.0 for 1% of sum insured
  dailyLimit?: number; // e.g., 5000
  icuDailyLimit?: number;
}

export interface ICopayment {
  hasCopay: boolean;
  percentage: number;
  appliesTo: 'ALL' | 'ZONE' | 'SENIOR' | 'SPECIAL_HOSPITALS' | 'NONE';
  remarks?: string;
}

export interface IDeductible {
  hasDeductible: boolean;
  amount: number;
  deductibleType: 'PER_CLAIM' | 'PER_YEAR';
}

export interface IWaitingPeriods {
  initialWaitingPeriodDays: number;
  specificDiseaseMonths: number;
  preExistingDiseaseMonths: number;
}

export interface IFieldConfirmation {
  fieldName: string;
  value: any;
  status: FieldConfirmationStatus;
  notes?: string;
  sourceDocumentId?: Types.ObjectId;
  sourcePage?: number;
  confirmedAt?: Date;
  updatedBy?: Types.ObjectId;
}

export interface IPolicy extends Document {
  userId: Types.ObjectId;
  insurerName: string;
  policyName: string;
  policyNumber: string;
  policyType: PolicyType;
  sumInsured: number;
  premium?: number;
  inceptionDate: Date;
  expiryDate: Date;
  renewalDate?: Date;
  membersCovered: IMemberCovered[];
  roomRentLimit: IRoomRentLimit;
  copayment: ICopayment;
  deductible: IDeductible;
  waitingPeriods: IWaitingPeriods;
  diseaseSpecificRestrictions?: Array<{
    diseaseName: string;
    sublimitAmount?: number;
    waitingPeriodMonths?: number;
  }>;
  exclusions: string[];
  subLimits?: Array<{
    category: string;
    limitAmount: number;
    clauseRef?: string;
  }>;
  restorationBenefit: {
    isAvailable: boolean;
    percentage?: number;
    triggers?: string;
  };
  networkHospitalInfo?: Record<string, any>;
  confirmationStatus: ConfirmationStatus;
  fieldConfirmations: IFieldConfirmation[];
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const MemberCoveredSchema = new Schema<IMemberCovered>({
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  age: { type: Number, required: true },
  dob: { type: Date }
}, { _id: false });

const RoomRentLimitSchema = new Schema<IRoomRentLimit>({
  limitType: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED', 'NO_LIMIT'],
    default: 'NO_LIMIT'
  },
  percentage: { type: Number, default: 0 },
  dailyLimit: { type: Number, default: 0 },
  icuDailyLimit: { type: Number, default: 0 }
}, { _id: false });

const CopaymentSchema = new Schema<ICopayment>({
  hasCopay: { type: Boolean, default: false },
  percentage: { type: Number, default: 0 },
  appliesTo: {
    type: String,
    enum: ['ALL', 'ZONE', 'SENIOR', 'SPECIAL_HOSPITALS', 'NONE'],
    default: 'NONE'
  },
  remarks: { type: String }
}, { _id: false });

const DeductibleSchema = new Schema<IDeductible>({
  hasDeductible: { type: Boolean, default: false },
  amount: { type: Number, default: 0 },
  deductibleType: {
    type: String,
    enum: ['PER_CLAIM', 'PER_YEAR'],
    default: 'PER_CLAIM'
  }
}, { _id: false });

const WaitingPeriodsSchema = new Schema<IWaitingPeriods>({
  initialWaitingPeriodDays: { type: Number, default: 30 },
  specificDiseaseMonths: { type: Number, default: 24 },
  preExistingDiseaseMonths: { type: Number, default: 36 }
}, { _id: false });

const FieldConfirmationSchema = new Schema<IFieldConfirmation>({
  fieldName: { type: String, required: true },
  value: { type: Schema.Types.Mixed },
  status: {
    type: String,
    enum: Object.values(FIELD_CONFIRMATION_STATUS),
    default: FIELD_CONFIRMATION_STATUS.UNCONFIRMED
  },
  notes: { type: String },
  sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'PolicyDocument' },
  sourcePage: { type: Number },
  confirmedAt: { type: Date },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const PolicySchema = new Schema<IPolicy>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    insurerName: { type: String, required: true, trim: true },
    policyName: { type: String, required: true, trim: true },
    policyNumber: { type: String, required: true, trim: true },
    policyType: {
      type: String,
      enum: Object.values(POLICY_TYPES),
      default: POLICY_TYPES.INDIVIDUAL
    },
    sumInsured: { type: Number, required: true, min: 0 },
    premium: { type: Number, min: 0 },
    inceptionDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    renewalDate: { type: Date },
    membersCovered: { type: [MemberCoveredSchema], default: [] },
    roomRentLimit: { type: RoomRentLimitSchema, default: () => ({ limitType: 'NO_LIMIT' }) },
    copayment: { type: CopaymentSchema, default: () => ({ hasCopay: false, percentage: 0 }) },
    deductible: { type: DeductibleSchema, default: () => ({ hasDeductible: false, amount: 0 }) },
    waitingPeriods: {
      type: WaitingPeriodsSchema,
      default: () => ({ initialWaitingPeriodDays: 30, specificDiseaseMonths: 24, preExistingDiseaseMonths: 36 })
    },
    diseaseSpecificRestrictions: [
      {
        diseaseName: { type: String, required: true },
        sublimitAmount: { type: Number },
        waitingPeriodMonths: { type: Number }
      }
    ],
    exclusions: { type: [String], default: [] },
    subLimits: [
      {
        category: { type: String, required: true },
        limitAmount: { type: Number, required: true },
        clauseRef: { type: String }
      }
    ],
    restorationBenefit: {
      isAvailable: { type: Boolean, default: false },
      percentage: { type: Number, default: 0 },
      triggers: { type: String }
    },
    networkHospitalInfo: { type: Schema.Types.Mixed },
    confirmationStatus: {
      type: String,
      enum: Object.values(CONFIRMATION_STATUS),
      default: CONFIRMATION_STATUS.UNCONFIRMED
    },
    fieldConfirmations: { type: [FieldConfirmationSchema], default: [] },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUSES),
      default: VERIFICATION_STATUSES.MANUALLY_ENTERED
    }
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

PolicySchema.index({ userId: 1, policyNumber: 1 }, { unique: true });
PolicySchema.index({ userId: 1, confirmationStatus: 1 });

export const Policy: Model<IPolicy> =
  mongoose.models.Policy || mongoose.model<IPolicy>('Policy', PolicySchema);

