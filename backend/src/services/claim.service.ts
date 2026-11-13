import crypto from 'crypto';
import { Types } from 'mongoose';
import { Claim, IClaim } from '../models/claim.model';
import { Policy } from '../models/policy.model';
import { CreateClaimDto, UpdateClaimStatusDto } from '../validators/claim.validator';
import { AppError } from '../middleware/errorHandler';
import { CLAIM_STAGES, ClaimStage, STATUS_SOURCES } from '../constants';

// Allowed forward transitions in the standard claim lifecycle
const VALID_STAGE_TRANSITIONS: Record<ClaimStage, ClaimStage[]> = {
  [CLAIM_STAGES.POLICY_CONFIRMED]: [
    CLAIM_STAGES.HOSPITAL_SELECTED,
    CLAIM_STAGES.ADMISSION_INITIATED,
    CLAIM_STAGES.CLAIM_CLOSED
  ],
  [CLAIM_STAGES.HOSPITAL_SELECTED]: [
    CLAIM_STAGES.ADMISSION_INITIATED,
    CLAIM_STAGES.PRE_AUTH_SUBMITTED,
    CLAIM_STAGES.CLAIM_CLOSED
  ],
  [CLAIM_STAGES.ADMISSION_INITIATED]: [
    CLAIM_STAGES.PRE_AUTH_SUBMITTED,
    CLAIM_STAGES.TREATMENT_COMPLETED,
    CLAIM_STAGES.CLAIM_CLOSED
  ],
  [CLAIM_STAGES.PRE_AUTH_SUBMITTED]: [
    CLAIM_STAGES.PRE_AUTH_PENDING,
    CLAIM_STAGES.PRE_AUTH_APPROVED,
    CLAIM_STAGES.PRE_AUTH_REJECTED,
    CLAIM_STAGES.CLAIM_CLOSED
  ],
  [CLAIM_STAGES.PRE_AUTH_PENDING]: [
    CLAIM_STAGES.PRE_AUTH_APPROVED,
    CLAIM_STAGES.PRE_AUTH_REJECTED,
    CLAIM_STAGES.TREATMENT_COMPLETED,
    CLAIM_STAGES.CLAIM_CLOSED
  ],
  [CLAIM_STAGES.PRE_AUTH_APPROVED]: [
    CLAIM_STAGES.TREATMENT_COMPLETED,
    CLAIM_STAGES.FINAL_BILL_SUBMITTED,
    CLAIM_STAGES.CLAIM_CLOSED
  ],
  [CLAIM_STAGES.PRE_AUTH_REJECTED]: [
    CLAIM_STAGES.TREATMENT_COMPLETED,
    CLAIM_STAGES.FINAL_BILL_SUBMITTED, // Converts to reimbursement flow
    CLAIM_STAGES.CLAIM_CLOSED
  ],
  [CLAIM_STAGES.TREATMENT_COMPLETED]: [
    CLAIM_STAGES.FINAL_BILL_SUBMITTED,
    CLAIM_STAGES.CLAIM_UNDER_REVIEW,
    CLAIM_STAGES.CLAIM_CLOSED
  ],
  [CLAIM_STAGES.FINAL_BILL_SUBMITTED]: [
    CLAIM_STAGES.CLAIM_UNDER_REVIEW,
    CLAIM_STAGES.CLAIM_SETTLED,
    CLAIM_STAGES.CLAIM_CLOSED
  ],
  [CLAIM_STAGES.CLAIM_UNDER_REVIEW]: [
    CLAIM_STAGES.CLAIM_SETTLED,
    CLAIM_STAGES.CLAIM_CLOSED
  ],
  [CLAIM_STAGES.CLAIM_SETTLED]: [
    CLAIM_STAGES.CLAIM_CLOSED
  ],
  [CLAIM_STAGES.CLAIM_CLOSED]: []
};

export class ClaimService {
  private generateClaimNumber(): string {
    const year = new Date().getFullYear();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `CLM-${year}-${rand}`;
  }

  async createClaim(userId: string, dto: CreateClaimDto): Promise<IClaim> {
    const policy = await Policy.findOne({
      _id: new Types.ObjectId(dto.policyId),
      userId: new Types.ObjectId(userId)
    });

    if (!policy) {
      throw new AppError('Associated policy not found or does not belong to you', 404, 'POLICY_NOT_FOUND');
    }

    const claimNumber = this.generateClaimNumber();
    const initialStage = CLAIM_STAGES.POLICY_CONFIRMED;
    const now = new Date();

    const claim = await Claim.create({
      claimNumber,
      userId: new Types.ObjectId(userId),
      policyId: policy._id,
      hospitalId: dto.hospitalId ? new Types.ObjectId(dto.hospitalId) : undefined,
      claimType: dto.claimType,
      currentStage: initialStage,
      statusSource: STATUS_SOURCES.USER_REPORTED,
      claimedAmount: dto.claimedAmount,
      diseaseOrDiagnosis: dto.diseaseOrDiagnosis,
      admissionDate: dto.admissionDate,
      dischargeDate: dto.dischargeDate,
      stageHistory: [
        {
          stage: initialStage,
          timestamp: now,
          updatedBy: new Types.ObjectId(userId),
          remarks: 'Claim initiated by user',
          source: STATUS_SOURCES.USER_REPORTED
        }
      ]
    });

    return claim;
  }

  async getUserClaims(
    userId: string,
    options: { stage?: ClaimStage; page?: number; limit?: number } = {}
  ): Promise<{ claims: IClaim[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = { userId: new Types.ObjectId(userId) };
    if (options.stage) {
      filter.currentStage = options.stage;
    }

    const [claims, total] = await Promise.all([
      Claim.find(filter)
        .populate('policyId', 'insurerName policyName policyNumber sumInsured')
        .populate('hospitalId', 'hospitalName city address contactPhone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Claim.countDocuments(filter)
    ]);

    return {
      claims,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getClaimById(claimId: string, userId: string, isAdmin = false): Promise<IClaim> {
    const query: any = { _id: new Types.ObjectId(claimId) };
    if (!isAdmin) {
      query.userId = new Types.ObjectId(userId);
    }

    const claim = await Claim.findOne(query)
      .populate('policyId')
      .populate('hospitalId');

    if (!claim) {
      throw new AppError('Claim record not found or access denied', 404, 'CLAIM_NOT_FOUND');
    }
    return claim;
  }

  async updateClaimStatus(
    claimId: string,
    userId: string,
    dto: UpdateClaimStatusDto,
    isAdmin = false
  ): Promise<IClaim> {
    const claim = await this.getClaimById(claimId, userId, isAdmin);

    // Validate stage transition
    const current = claim.currentStage;
    const target = dto.newStage;

    if (current === target) {
      throw new AppError(`Claim is already in stage '${current}'`, 400, 'STAGE_UNCHANGED');
    }

    // Admins have override privileges, users must follow allowed transitions
    if (!isAdmin) {
      const allowedNext = VALID_STAGE_TRANSITIONS[current] || [];
      if (!allowedNext.includes(target)) {
        throw new AppError(
          `Invalid stage transition: cannot move claim from '${current}' directly to '${target}'. Allowed transitions: [${allowedNext.join(', ')}]`,
          400,
          'INVALID_STAGE_TRANSITION'
        );
      }
    }

    const now = new Date();
    claim.currentStage = target;
    claim.statusSource = dto.statusSource || (isAdmin ? STATUS_SOURCES.INSURER_CONFIRMED : STATUS_SOURCES.USER_REPORTED);

    if (dto.approvedAmount !== undefined) {
      claim.approvedAmount = dto.approvedAmount;
    }
    if (dto.settledAmount !== undefined) {
      claim.settledAmount = dto.settledAmount;
    }

    claim.stageHistory.push({
      stage: target,
      timestamp: now,
      updatedBy: new Types.ObjectId(userId),
      remarks: dto.remarks || `Status transitioned to ${target}`,
      source: claim.statusSource,
      approvedAmount: dto.approvedAmount
    });

    await claim.save();
    return claim;
  }
}

export const claimService = new ClaimService();

