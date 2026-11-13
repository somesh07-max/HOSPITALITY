import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { SHAREABLE_RESOURCE_TYPES, ShareableResourceType } from '../constants';

export interface IShareLink extends Document {
  userId: Types.ObjectId;
  resourceType: ShareableResourceType;
  resourceId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  permission: 'VIEW_ONLY';
  accessCount: number;
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShareLinkSchema = new Schema<IShareLink>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resourceType: {
      type: String,
      enum: Object.values(SHAREABLE_RESOURCE_TYPES),
      required: true
    },
    resourceId: { type: Schema.Types.ObjectId, required: true, index: true },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    expiresAt: { type: Date, required: true, index: true },
    isRevoked: { type: Boolean, default: false, index: true },
    permission: { type: String, default: 'VIEW_ONLY' },
    accessCount: { type: Number, default: 0 },
    lastAccessedAt: { type: Date }
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

ShareLinkSchema.index({ token: 1, isRevoked: 1, expiresAt: 1 });

export const ShareLink: Model<IShareLink> =
  mongoose.models.ShareLink || mongoose.model<IShareLink>('ShareLink', ShareLinkSchema);

