import crypto from 'crypto';
import { Types } from 'mongoose';
import { ShareLink, IShareLink } from '../models/shareLink.model';
import { Policy } from '../models/policy.model';
import { Claim } from '../models/claim.model';
import { BillAudit } from '../models/billAudit.model';
import { AppError } from '../middleware/errorHandler';
import { ShareableResourceType } from '../constants';

export class ShareService {
  async createShareLink(
    userId: string,
    resourceType: ShareableResourceType,
    resourceId: string,
    expiresInHours = 72
  ): Promise<{ link: IShareLink; token: string; shareUrl: string }> {
    const userObjId = new Types.ObjectId(userId);
    const resObjId = new Types.ObjectId(resourceId);

    // Verify ownership of the resource
    if (resourceType === 'POLICY') {
      const p = await Policy.findOne({ _id: resObjId, userId: userObjId });
      if (!p) throw new AppError('Policy not found or access denied', 404, 'RESOURCE_NOT_FOUND');
    } else if (resourceType === 'CLAIM') {
      const c = await Claim.findOne({ _id: resObjId, userId: userObjId });
      if (!c) throw new AppError('Claim not found or access denied', 404, 'RESOURCE_NOT_FOUND');
    } else if (resourceType === 'BILL_AUDIT') {
      const b = await BillAudit.findOne({ _id: resObjId, userId: userObjId });
      if (!b) throw new AppError('Bill audit not found or access denied', 404, 'RESOURCE_NOT_FOUND');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const link = await ShareLink.create({
      userId: userObjId,
      resourceType,
      resourceId: resObjId,
      token,
      expiresAt,
      isRevoked: false,
      permission: 'VIEW_ONLY',
      accessCount: 0
    });

    return {
      link,
      token,
      shareUrl: `/api/v1/shared/${token}`
    };
  }

  async getSharedResource(token: string): Promise<{
    resourceType: ShareableResourceType;
    sanitizedData: Record<string, any>;
    expiresAt: Date;
    accessCount: number;
  }> {
    const link = await ShareLink.findOne({ token });

    if (!link) {
      throw new AppError('Shared link not found or invalid', 404, 'SHARE_LINK_INVALID');
    }

    if (link.isRevoked) {
      throw new AppError('This shared link has been revoked by the owner', 410, 'SHARE_LINK_REVOKED');
    }

    if (new Date() > link.expiresAt) {
      throw new AppError('This shared link has expired', 410, 'SHARE_LINK_EXPIRED');
    }

    link.accessCount += 1;
    link.lastAccessedAt = new Date();
    await link.save();

    let sanitizedData: Record<string, any> = {};

    if (link.resourceType === 'POLICY') {
      const policy = await Policy.findById(link.resourceId);
      if (!policy) throw new AppError('Resource is no longer available', 404, 'RESOURCE_GONE');
      // Strip private IDs and document links
      sanitizedData = {
        insurerName: policy.insurerName,
        policyName: policy.policyName,
        policyType: policy.policyType,
        sumInsured: policy.sumInsured,
        inceptionDate: policy.inceptionDate,
        expiryDate: policy.expiryDate,
        roomRentLimit: policy.roomRentLimit,
        copayment: policy.copayment,
        deductible: policy.deductible,
        waitingPeriods: policy.waitingPeriods,
        exclusions: policy.exclusions,
        confirmationStatus: policy.confirmationStatus
      };
    } else if (link.resourceType === 'CLAIM') {
      const claim = await Claim.findById(link.resourceId).populate('policyId', 'insurerName policyName');
      if (!claim) throw new AppError('Resource is no longer available', 404, 'RESOURCE_GONE');
      sanitizedData = {
        claimNumber: claim.claimNumber,
        claimType: claim.claimType,
        currentStage: claim.currentStage,
        claimedAmount: claim.claimedAmount,
        approvedAmount: claim.approvedAmount,
        stageHistory: claim.stageHistory.map((s) => ({
          stage: s.stage,
          timestamp: s.timestamp,
          remarks: s.remarks,
          source: s.source
        }))
      };
    } else if (link.resourceType === 'BILL_AUDIT') {
      const audit = await BillAudit.findById(link.resourceId);
      if (!audit) throw new AppError('Resource is no longer available', 404, 'RESOURCE_GONE');
      sanitizedData = {
        totalBilledAmount: audit.totalBilledAmount,
        eligibleAmount: audit.eligibleAmount,
        nonEligibleAmount: audit.nonEligibleAmount,
        estimatedPayableAmount: audit.estimatedPayableAmount,
        findings: audit.findings,
        items: audit.items.map((i) => ({
          description: i.description,
          category: i.category,
          billedAmount: i.billedAmount,
          allowedAmount: i.allowedAmount,
          isCovered: i.isCovered,
          deductionReason: i.deductionReason
        }))
      };
    }

    return {
      resourceType: link.resourceType,
      sanitizedData,
      expiresAt: link.expiresAt,
      accessCount: link.accessCount
    };
  }

  async revokeShareLink(linkId: string, userId: string): Promise<boolean> {
    const link = await ShareLink.findOne({
      _id: new Types.ObjectId(linkId),
      userId: new Types.ObjectId(userId)
    });

    if (!link) {
      throw new AppError('Share link not found or access denied', 404, 'SHARE_LINK_NOT_FOUND');
    }

    link.isRevoked = true;
    await link.save();
    return true;
  }
}

export const shareService = new ShareService();

