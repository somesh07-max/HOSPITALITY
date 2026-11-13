import { Types } from 'mongoose';
import { ClaimRejectionRecord, IRejectionRecord } from '../models/rejection.model';
import { Claim } from '../models/claim.model';
import { Policy } from '../models/policy.model';
import { AppError } from '../middleware/errorHandler';
import { RejectionCategory, LEGAL_CLAUSE_REFERENCES } from '../constants';

export interface RecordRejectionInput {
  claimId: string;
  claimedAmount: number;
  approvedAmount?: number;
  rejectionCategory: RejectionCategory;
  insurerRemarks?: string;
}

export class RejectionService {
  async recordRejection(userId: string, input: RecordRejectionInput): Promise<IRejectionRecord> {
    const claim = await Claim.findOne({
      _id: new Types.ObjectId(input.claimId),
      userId: new Types.ObjectId(userId)
    });

    if (!claim) {
      throw new AppError('Claim record not found or does not belong to you', 404, 'CLAIM_NOT_FOUND');
    }

    const policy = await Policy.findById(claim.policyId);
    if (!policy) {
      throw new AppError('Associated policy record not found', 404, 'POLICY_NOT_FOUND');
    }

    const claimed = Math.max(0, input.claimedAmount);
    const approved = Math.max(0, input.approvedAmount || 0);
    const difference = Math.max(0, claimed - approved);

    // Deterministic classification based on category
    let title = '';
    let explanation = '';
    const relevantClauses: string[] = [];
    const recommendedAppealActions: string[] = [];
    let appealViability: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    switch (input.rejectionCategory) {
      case 'MISSING_DOCUMENTS':
        title = 'Settlement Shortfall Due to Missing Supporting Documentation';
        explanation = 'The insurer or TPA could not verify specific bill items due to missing hospital records, lab reports, or itemized pharmacy invoices.';
        relevantClauses.push('IRDAI Master Circular 2024 - Document Requirements for Claim Settlement');
        recommendedAppealActions.push('Request itemized break-up bill and indoor case papers (ICP) from hospital billing department.');
        recommendedAppealActions.push('Re-submit claim documents through the insurer web portal within 15 days.');
        appealViability = 'HIGH';
        break;

      case 'ROOM_RENT_CAPPING':
        title = 'Proportionate Deduction Applied Due to Room Rent Threshold Exceeded';
        explanation = 'Room occupied was higher than the policy daily limit, resulting in proportionate deductions on associated surgeon, OT, and doctor charges.';
        relevantClauses.push(LEGAL_CLAUSE_REFERENCES.IRDAI_CIRCULAR_2020_ROOM_RENT);
        recommendedAppealActions.push('Audit hospital final bill to ensure medicines, consumables, and diagnostic tests were NOT scaled down.');
        recommendedAppealActions.push('If pharmacy or implants were proportionately reduced, file a formal grievance citing IRDAI Circular Clause 5.2.');
        appealViability = 'HIGH';
        break;

      case 'WAITING_PERIOD':
        title = 'Claim Disallowed Under Policy Waiting Period Exclusion';
        explanation = 'Treatment commenced before the completion of the mandatory initial 30-day, specific disease (24-month), or pre-existing disease waiting period.';
        relevantClauses.push('IRDAI Standard Health Insurance Regulations - Waiting Period Guidelines');
        recommendedAppealActions.push('Verify if treatment was necessitated by an accidental emergency (which waives waiting periods).');
        recommendedAppealActions.push('If you ported this policy from a previous insurer, provide previous policy schedules to claim portability continuity credit.');
        appealViability = 'LOW';
        break;

      case 'EXCLUSION':
        title = 'Claim Disallowed Under Permanent Policy Exclusions';
        explanation = 'The ailment or procedure is explicitly listed in Section 4 (Exclusions) of the standard policy wording.';
        relevantClauses.push('IRDAI Guidelines on Standardization of Exclusions in Health Insurance');
        recommendedAppealActions.push('Obtain a medical certificate from treating specialist clarifying the clinical necessity of the procedure.');
        appealViability = 'LOW';
        break;

      case 'COPAYMENT':
        title = 'Deduction Attributable to Contractual Co-Payment Clause';
        explanation = `Policy terms specify a mandatory co-payment cost share on admissible expenses.`;
        relevantClauses.push('Policy Schedule - Co-Payment Terms');
        recommendedAppealActions.push('Review whether co-payment was applied only to admissible expenses rather than gross bill.');
        appealViability = 'LOW';
        break;

      case 'NON_COVERED_EXPENSE':
      default:
        title = 'Non-Admissible Overhead and Consumables Deduction';
        explanation = 'Certain line items (administrative fees, sanitary items, dietary charges) are non-payable under standard insurer tariff guidelines.';
        relevantClauses.push('IRDAI Standard Non-Admissible Expenses Schedule');
        recommendedAppealActions.push('Compare deducted items against official IRDAI List 1 (Expenses Not Covered).');
        appealViability = 'MEDIUM';
        break;
    }

    // Prepare structured payload for future AI grievance letter generation
    const preparedForAiContext = {
      claimNumber: claim.claimNumber,
      insurerName: policy.insurerName,
      policyName: policy.policyName,
      policyNumber: policy.policyNumber,
      claimedAmount: claimed,
      approvedAmount: approved,
      differenceAmount: difference,
      category: input.rejectionCategory,
      insurerRemarks: input.insurerRemarks || 'No remarks provided',
      legalClauses: relevantClauses,
      suggestedNextSteps: recommendedAppealActions
    };

    const record = await ClaimRejectionRecord.create({
      userId: new Types.ObjectId(userId),
      claimId: claim._id,
      policyId: policy._id,
      claimedAmount: claimed,
      approvedAmount: approved,
      differenceAmount: difference,
      rejectionCategory: input.rejectionCategory,
      insurerRemarks: input.insurerRemarks,
      deterministicClassification: {
        title,
        explanation,
        relevantClauses,
        recommendedAppealActions,
        appealViability
      },
      preparedForAiContext
    });

    return record;
  }

  async getRejectionByClaimId(claimId: string, userId: string, isAdmin = false): Promise<IRejectionRecord[]> {
    const query: any = { claimId: new Types.ObjectId(claimId) };
    if (!isAdmin) {
      query.userId = new Types.ObjectId(userId);
    }
    return ClaimRejectionRecord.find(query).sort({ createdAt: -1 });
  }
}

export const rejectionService = new RejectionService();

