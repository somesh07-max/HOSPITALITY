import { Types } from 'mongoose';
import { Policy, IPolicy } from '../models/policy.model';
import { PolicyDocument, IPolicyDocument } from '../models/document.model';
import { CreatePolicyDto, UpdatePolicyDto, ConfirmPolicyDto } from '../validators/policy.validator';
import { storageService } from './storage.service';
import { AppError } from '../middleware/errorHandler';
import {
  CONFIRMATION_STATUS,
  FIELD_CONFIRMATION_STATUS,
  DocumentType,
  VERIFICATION_STATUSES
} from '../constants';

export class PolicyService {
  async createPolicy(userId: string, dto: CreatePolicyDto): Promise<IPolicy> {
    const existing = await Policy.findOne({
      userId: new Types.ObjectId(userId),
      policyNumber: dto.policyNumber.trim()
    });

    if (existing) {
      throw new AppError(
        `Policy with number '${dto.policyNumber}' already exists in your account.`,
        409,
        'DUPLICATE_POLICY'
      );
    }

    const policy = await Policy.create({
      ...dto,
      userId: new Types.ObjectId(userId),
      confirmationStatus: CONFIRMATION_STATUS.UNCONFIRMED,
      verificationStatus: VERIFICATION_STATUSES.MANUALLY_ENTERED,
      fieldConfirmations: []
    });

    return policy;
  }

  async getUserPolicies(
    userId: string,
    options: { confirmationStatus?: string; page?: number; limit?: number } = {}
  ): Promise<{ policies: IPolicy[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = { userId: new Types.ObjectId(userId) };
    if (options.confirmationStatus) {
      query.confirmationStatus = options.confirmationStatus;
    }

    const [policies, total] = await Promise.all([
      Policy.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Policy.countDocuments(query)
    ]);

    return {
      policies,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getPolicyById(policyId: string, userId: string, isAdmin = false): Promise<IPolicy> {
    const query: any = { _id: new Types.ObjectId(policyId) };
    if (!isAdmin) {
      query.userId = new Types.ObjectId(userId);
    }

    const policy = await Policy.findOne(query);
    if (!policy) {
      throw new AppError('Policy not found or access denied.', 404, 'POLICY_NOT_FOUND');
    }
    return policy;
  }

  async updatePolicy(
    policyId: string,
    userId: string,
    dto: UpdatePolicyDto,
    isAdmin = false
  ): Promise<IPolicy> {
    const policy = await this.getPolicyById(policyId, userId, isAdmin);

    Object.assign(policy, dto);
    await policy.save();
    return policy;
  }

  async deletePolicy(policyId: string, userId: string, isAdmin = false): Promise<boolean> {
    const policy = await this.getPolicyById(policyId, userId, isAdmin);

    // Delete associated documents from disk and DB
    const documents = await PolicyDocument.find({ policyId: policy._id });
    for (const doc of documents) {
      await storageService.deleteFile(doc.filePath);
    }
    await PolicyDocument.deleteMany({ policyId: policy._id });

    await policy.deleteOne();
    return true;
  }

  async confirmPolicy(
    policyId: string,
    userId: string,
    dto: ConfirmPolicyDto
  ): Promise<IPolicy> {
    const policy = await this.getPolicyById(policyId, userId);

    const now = new Date();
    const updaterId = new Types.ObjectId(userId);

    // Update or insert field confirmations
    for (const fc of dto.fieldConfirmations) {
      const existingIdx = policy.fieldConfirmations.findIndex((f) => f.fieldName === fc.fieldName);
      const confirmationRecord = {
        fieldName: fc.fieldName,
        value: (policy as any)[fc.fieldName],
        status: fc.status,
        notes: fc.notes,
        sourceDocumentId: fc.sourceDocumentId ? new Types.ObjectId(fc.sourceDocumentId) : undefined,
        sourcePage: fc.sourcePage,
        confirmedAt: now,
        updatedBy: updaterId
      };

      if (existingIdx >= 0) {
        policy.fieldConfirmations[existingIdx] = confirmationRecord;
      } else {
        policy.fieldConfirmations.push(confirmationRecord);
      }
    }

    if (dto.markAllConfirmed) {
      policy.confirmationStatus = CONFIRMATION_STATUS.CONFIRMED;
    } else {
      const hasNeedsCorrection = policy.fieldConfirmations.some(
        (f) => f.status === FIELD_CONFIRMATION_STATUS.NEEDS_CORRECTION
      );
      const confirmedCount = policy.fieldConfirmations.filter(
        (f) => f.status === FIELD_CONFIRMATION_STATUS.CONFIRMED
      ).length;

      if (hasNeedsCorrection) {
        policy.confirmationStatus = CONFIRMATION_STATUS.PARTIALLY_CONFIRMED;
      } else if (confirmedCount >= 5) {
        policy.confirmationStatus = CONFIRMATION_STATUS.CONFIRMED;
      } else if (confirmedCount > 0) {
        policy.confirmationStatus = CONFIRMATION_STATUS.PARTIALLY_CONFIRMED;
      }
    }

    await policy.save();
    return policy;
  }

  async addDocument(
    policyId: string,
    userId: string,
    file: Express.Multer.File,
    documentType: DocumentType
  ): Promise<IPolicyDocument> {
    const policy = await this.getPolicyById(policyId, userId);

    const storageResult = await storageService.saveFile(file, `policies/${policy._id}`);

    const doc = await PolicyDocument.create({
      policyId: policy._id,
      userId: new Types.ObjectId(userId),
      originalFilename: file.originalname,
      storedFilename: storageResult.storedFilename,
      filePath: storageResult.filePath,
      fileSize: storageResult.fileSize,
      mimeType: file.mimetype,
      documentType,
      uploadDate: new Date()
    });

    return doc;
  }

  async getPolicyDocuments(policyId: string, userId: string): Promise<IPolicyDocument[]> {
    await this.getPolicyById(policyId, userId);
    return PolicyDocument.find({ policyId: new Types.ObjectId(policyId) }).sort({ uploadDate: -1 });
  }

  async getDocumentById(
    documentId: string,
    userId: string,
    isAdmin = false
  ): Promise<IPolicyDocument> {
    const query: any = { _id: new Types.ObjectId(documentId) };
    if (!isAdmin) {
      query.userId = new Types.ObjectId(userId);
    }

    const doc = await PolicyDocument.findOne(query);
    if (!doc) {
      throw new AppError('Document not found or access denied.', 404, 'DOCUMENT_NOT_FOUND');
    }
    return doc;
  }

  async deleteDocument(documentId: string, userId: string, isAdmin = false): Promise<boolean> {
    const doc = await this.getDocumentById(documentId, userId, isAdmin);
    await storageService.deleteFile(doc.filePath);
    await doc.deleteOne();
    return true;
  }
}

export const policyService = new PolicyService();

