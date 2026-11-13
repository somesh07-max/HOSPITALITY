import mongoose, { Document, Model, Schema } from 'mongoose';
import { VERIFICATION_STATUSES, VerificationStatus } from '../constants';

export interface IInsurerRelationship {
  insurerName: string;
  networkStatus: 'IN_NETWORK' | 'OUT_OF_NETWORK' | 'EXCLUDED';
  cashlessAvailable: boolean;
  tpaName?: string;
  tier?: 'TIER_1' | 'TIER_2' | 'TIER_3';
}

export interface IHospital extends Document {
  hospitalName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone?: string;
  contactEmail?: string;
  insurerRelationships: IInsurerRelationship[];
  verificationStatus: VerificationStatus;
  dataSource: string;
  lastUpdatedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InsurerRelationshipSchema = new Schema<IInsurerRelationship>(
  {
    insurerName: { type: String, required: true },
    networkStatus: {
      type: String,
      enum: ['IN_NETWORK', 'OUT_OF_NETWORK', 'EXCLUDED'],
      default: 'IN_NETWORK'
    },
    cashlessAvailable: { type: Boolean, default: true },
    tpaName: { type: String },
    tier: { type: String, enum: ['TIER_1', 'TIER_2', 'TIER_3'], default: 'TIER_1' }
  },
  { _id: false }
);

const HospitalSchema = new Schema<IHospital>(
  {
    hospitalName: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true, index: true },
    contactPhone: { type: String },
    contactEmail: { type: String },
    insurerRelationships: { type: [InsurerRelationshipSchema], default: [] },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUSES),
      default: VERIFICATION_STATUSES.VERIFIED_OFFICIAL
    },
    dataSource: { type: String, default: 'HOSPITALITY_VERIFIED_REGISTRY_2026' },
    lastUpdatedDate: { type: Date, default: Date.now }
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

HospitalSchema.index({ city: 1, hospitalName: 1 });

export const Hospital: Model<IHospital> =
  mongoose.models.Hospital || mongoose.model<IHospital>('Hospital', HospitalSchema);
