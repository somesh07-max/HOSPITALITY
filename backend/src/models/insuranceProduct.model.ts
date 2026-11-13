import mongoose, { Document, Model, Schema } from 'mongoose';
import { VERIFICATION_STATUSES, VerificationStatus } from '../constants';

export interface IInsuranceProduct extends Document {
  insurerName: string;
  productName: string;
  planType: 'INDIVIDUAL' | 'FAMILY_FLOATER';
  availableSumInsuredOptions: number[];
  entryAgeMin: number;
  entryAgeMax: number;
  hasRoomRentCapping: boolean;
  roomRentCondition: string;
  hasCopayment: boolean;
  copayPercentage: number;
  pedWaitingPeriodMonths: number;
  specificDiseaseWaitingMonths: number;
  hasRestorationBenefit: boolean;
  dayCareProceduresCovered: boolean;
  sampleAnnualPremiumEstimate: {
    ageRange: string;
    sumInsured: number;
    estimatedPremium: number;
  }[];
  importantLimitations: string[];
  brochureSourceUrl?: string;
  verificationStatus: VerificationStatus;
  dataSource: string;
  createdAt: Date;
  updatedAt: Date;
}

const InsuranceProductSchema = new Schema<IInsuranceProduct>(
  {
    insurerName: { type: String, required: true, trim: true, index: true },
    productName: { type: String, required: true, trim: true },
    planType: {
      type: String,
      enum: ['INDIVIDUAL', 'FAMILY_FLOATER'],
      default: 'INDIVIDUAL'
    },
    availableSumInsuredOptions: { type: [Number], required: true },
    entryAgeMin: { type: Number, default: 18 },
    entryAgeMax: { type: Number, default: 65 },
    hasRoomRentCapping: { type: Boolean, default: false },
    roomRentCondition: { type: String, required: true },
    hasCopayment: { type: Boolean, default: false },
    copayPercentage: { type: Number, default: 0 },
    pedWaitingPeriodMonths: { type: Number, default: 36 },
    specificDiseaseWaitingMonths: { type: Number, default: 24 },
    hasRestorationBenefit: { type: Boolean, default: true },
    dayCareProceduresCovered: { type: Boolean, default: true },
    sampleAnnualPremiumEstimate: [
      {
        ageRange: { type: String, required: true },
        sumInsured: { type: Number, required: true },
        estimatedPremium: { type: Number, required: true }
      }
    ],
    importantLimitations: { type: [String], default: [] },
    brochureSourceUrl: { type: String },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUSES),
      default: VERIFICATION_STATUSES.VERIFIED_OFFICIAL
    },
    dataSource: { type: String, default: 'IRDAI_PUBLIC_PRODUCT_FILING_2026' }
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

export const InsuranceProduct: Model<IInsuranceProduct> =
  mongoose.models.InsuranceProduct ||
  mongoose.model<IInsuranceProduct>('InsuranceProduct', InsuranceProductSchema);

