import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IAuditItem {
  description: string;
  category: string;
  billedAmount: number;
  allowedAmount: number;
  deductedAmount: number;
  isCovered: boolean;
  deductionReason?: string;
  ruleReference?: string;
}

export interface IAuditFinding {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  code: string;
  message: string;
  financialImpact: number;
}

export interface IBillAudit extends Document {
  userId: Types.ObjectId;
  policyId: Types.ObjectId;
  claimId?: Types.ObjectId;
  totalBilledAmount: number;
  eligibleAmount: number;
  nonEligibleAmount: number;
  estimatedPayableAmount: number;
  items: IAuditItem[];
  findings: IAuditFinding[];
  auditedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuditItemSchema = new Schema<IAuditItem>(
  {
    description: { type: String, required: true },
    category: { type: String, required: true },
    billedAmount: { type: Number, required: true },
    allowedAmount: { type: Number, required: true },
    deductedAmount: { type: Number, default: 0 },
    isCovered: { type: Boolean, default: true },
    deductionReason: { type: String },
    ruleReference: { type: String }
  },
  { _id: false }
);

const AuditFindingSchema = new Schema<IAuditFinding>(
  {
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      required: true
    },
    code: { type: String, required: true },
    message: { type: String, required: true },
    financialImpact: { type: Number, default: 0 }
  },
  { _id: false }
);

const BillAuditSchema = new Schema<IBillAudit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    policyId: { type: Schema.Types.ObjectId, ref: 'Policy', required: true, index: true },
    claimId: { type: Schema.Types.ObjectId, ref: 'Claim', index: true },
    totalBilledAmount: { type: Number, required: true },
    eligibleAmount: { type: Number, required: true },
    nonEligibleAmount: { type: Number, required: true },
    estimatedPayableAmount: { type: Number, required: true },
    items: { type: [AuditItemSchema], default: [] },
    findings: { type: [AuditFindingSchema], default: [] },
    auditedAt: { type: Date, default: Date.now }
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

export const BillAudit: Model<IBillAudit> =
  mongoose.models.BillAudit || mongoose.model<IBillAudit>('BillAudit', BillAuditSchema);

