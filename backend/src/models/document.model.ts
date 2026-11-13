import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { DOCUMENT_TYPES, DocumentType } from '../constants';

export interface IPolicyDocument extends Document {
  policyId: Types.ObjectId;
  userId: Types.ObjectId;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentType: DocumentType;
  uploadDate: Date;
}

const PolicyDocumentSchema = new Schema<IPolicyDocument>(
  {
    policyId: {
      type: Schema.Types.ObjectId,
      ref: 'Policy',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    originalFilename: { type: String, required: true },
    storedFilename: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => v === 'application/pdf',
        message: 'Only PDF documents are permitted'
      }
    },
    documentType: {
      type: String,
      enum: Object.values(DOCUMENT_TYPES),
      default: DOCUMENT_TYPES.POLICY_SCHEDULE
    },
    uploadDate: { type: Date, default: Date.now }
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

PolicyDocumentSchema.index({ policyId: 1, uploadDate: -1 });

export const PolicyDocument: Model<IPolicyDocument> =
  mongoose.models.PolicyDocument ||
  mongoose.model<IPolicyDocument>('PolicyDocument', PolicyDocumentSchema);

