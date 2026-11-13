import { DecisionTraceItem } from '../../types';
import { LEGAL_CLAUSE_REFERENCES, VERIFICATION_STATUSES, VerificationStatus } from '../../constants';

export interface BillItemInput {
  description: string;
  category:
    | 'ROOM_RENT'
    | 'ICU_CHARGES'
    | 'NURSING'
    | 'DOCTOR_FEE'
    | 'SURGEON_OT_FEE'
    | 'INVESTIGATION_DIAGNOSTICS'
    | 'PHARMACY_MEDICINE'
    | 'IMPLANTS'
    | 'CONSUMABLES'
    | 'OTHER';
  billedAmount: number;
  isProportionateEligible?: boolean; // If not provided, determined by rule
}

export interface ProportionateDeductionInput {
  ruleId?: string; // Optional: defaults to RULE_IRDAI_CIR_2020_OFFICIAL
  roomRentLimit: number; // e.g., 5000/day
  actualRoomRent: number; // e.g., 8000/day
  roomDays?: number;
  roomCategoryOccupied?: string;
  eligibleRoomCategory?: string;
  billItems: BillItemInput[];
}

export interface AuditedItemResult {
  description: string;
  category: string;
  billedAmount: number;
  allowedAmount: number;
  deductedAmount: number;
  isSubjectToProportionateDeduction: boolean;
  clauseNote: string;
}

export interface ProportionateDeductionResult {
  ruleId: string;
  ruleName: string;
  clauseReference: string;
  verificationStatus: VerificationStatus;
  proportionateRatio: number;
  roomRentLimit: number;
  actualRoomRent: number;
  isRoomRentExceeded: boolean;
  totalBilledAmount: number;
  totalAllowedAmount: number;
  totalProportionateDeduction: number;
  items: AuditedItemResult[];
  calculationSteps: string[];
  decisionTrace: DecisionTraceItem;
  disclaimer: string;
}

export class ProportionateDeductionService {
  calculate(input: ProportionateDeductionInput): ProportionateDeductionResult {
    const limit = Math.max(0, input.roomRentLimit);
    const actual = Math.max(0, input.actualRoomRent);

    const isExceeded = actual > limit && limit > 0;
    const ratio = isExceeded ? parseFloat((limit / actual).toFixed(4)) : 1.0;

    const ruleId = input.ruleId || 'RULE_IRDAI_CIR_2020_OFFICIAL';
    let ruleName = 'IRDAI Standard Proportionate Deduction Rule (2020)';
    let clauseRef: string = LEGAL_CLAUSE_REFERENCES.IRDAI_CIRCULAR_2020_ROOM_RENT;
    let verificationStatus: VerificationStatus = VERIFICATION_STATUSES.VERIFIED_OFFICIAL;

    if (ruleId === 'RULE_SYNTHETIC_STRICT_PROPORTIONATE_TEST') {
      ruleName = 'Synthetic Strict Proportionate Deduction Rule (Testing Only)';
      clauseRef = 'SYNTHETIC TEST CLAUSE - NOT FOR PRODUCTION SETTLEMENT';
      verificationStatus = VERIFICATION_STATUSES.SYNTHETIC_DATA;
    }

    const steps: string[] = [];
    steps.push(`Evaluated Room Rent Limit: Rs. ${limit}/day against Actual Billed: Rs. ${actual}/day.`);

    if (!isExceeded) {
      steps.push('Actual room rent is within the policy limit. Proportionate deduction factor is 1.0 (No penalty applied).');
    } else {
      steps.push(`Room rent limit exceeded by Rs. ${actual - limit}/day.`);
      steps.push(`Computed Proportionate Ratio: ${limit} / ${actual} = ${(ratio * 100).toFixed(2)}%.`);
      steps.push(`Under ${clauseRef}, medicines, diagnostic tests, and implants are protected from proportionate deduction.`);
    }

    let totalBilled = 0;
    let totalAllowed = 0;
    let totalDeductions = 0;

    const auditedItems: AuditedItemResult[] = input.billItems.map((item) => {
      const billed = Math.max(0, item.billedAmount);
      totalBilled += billed;

      // Determine if item is eligible for proportionate reduction under IRDAI guidelines
      let isSubject = false;

      if (!isExceeded) {
        isSubject = false;
      } else if (item.isProportionateEligible !== undefined) {
        isSubject = item.isProportionateEligible;
      } else {
        // Official IRDAI 2020 rule: Only associated medical fees tied to room category are scaled
        // Pharmacy, investigations, implants, ICU charges are NOT scaled
        switch (item.category) {
          case 'DOCTOR_FEE':
          case 'SURGEON_OT_FEE':
          case 'NURSING':
            isSubject = true;
            break;
          case 'ROOM_RENT':
            // Direct room rent is capped at limit * days
            isSubject = false;
            break;
          case 'ICU_CHARGES':
          case 'PHARMACY_MEDICINE':
          case 'INVESTIGATION_DIAGNOSTICS':
          case 'IMPLANTS':
          case 'CONSUMABLES':
          default:
            isSubject = false;
            break;
        }
      }

      let allowed = billed;
      let deducted = 0;
      let clauseNote = 'Paid in full';

      if (!isExceeded) {
        allowed = billed;
        deducted = 0;
        clauseNote = 'Within room rent limit; no proportionate reduction.';
      } else if (item.category === 'ROOM_RENT') {
        // Room rent direct excess capping
        const days = Math.max(1, input.roomDays || 1);
        const maxAllowedRoom = limit * days;
        if (billed > maxAllowedRoom) {
          allowed = maxAllowedRoom;
          deducted = billed - maxAllowedRoom;
          clauseNote = `Room rent capped at daily limit of Rs. ${limit} * ${days} days.`;
        }
      } else if (isSubject) {
        allowed = Math.round(billed * ratio);
        deducted = billed - allowed;
        clauseNote = `Scaled down proportionately by ${(ratio * 100).toFixed(2)}% under ${ruleId}.`;
      } else {
        allowed = billed;
        deducted = 0;
        clauseNote = `Protected from proportionate deduction per IRDAI Circular Clause 5.2.`;
      }

      totalAllowed += allowed;
      totalDeductions += deducted;

      return {
        description: item.description,
        category: item.category,
        billedAmount: billed,
        allowedAmount: allowed,
        deductedAmount: deducted,
        isSubjectToProportionateDeduction: isSubject,
        clauseNote
      };
    });

    steps.push(`Total Billed: Rs. ${totalBilled}. Total Allowed: Rs. ${totalAllowed}. Disallowed Proportionate Deduction: Rs. ${totalDeductions}.`);

    const decisionTrace: DecisionTraceItem = {
      ruleId,
      description: ruleName,
      clauseReference: clauseRef,
      verificationStatus,
      inputs: {
        roomRentLimit: limit,
        actualRoomRent: actual,
        roomDays: input.roomDays || 1,
        itemCount: input.billItems.length
      },
      calculationSteps: steps,
      output: {
        proportionateRatio: ratio,
        totalBilled,
        totalAllowed,
        totalDeductions
      },
      timestamp: new Date().toISOString()
    };

    return {
      ruleId,
      ruleName,
      clauseReference: clauseRef,
      verificationStatus,
      proportionateRatio: ratio,
      roomRentLimit: limit,
      actualRoomRent: actual,
      isRoomRentExceeded: isExceeded,
      totalBilledAmount: totalBilled,
      totalAllowedAmount: totalAllowed,
      totalProportionateDeduction: totalDeductions,
      items: auditedItems,
      calculationSteps: steps,
      decisionTrace,
      disclaimer:
        'This calculation is a deterministic simulation based on IRDAI guidelines and explicit policy data. It does not guarantee insurer claim settlement or final approved payout.'
    };
  }
}

export const proportionateDeductionService = new ProportionateDeductionService();

