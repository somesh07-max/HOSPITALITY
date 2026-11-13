import { DecisionTraceItem } from '../../types';
import { LEGAL_CLAUSE_REFERENCES, VERIFICATION_STATUSES } from '../../constants';

export interface RoomUpgradeInput {
  policyRoomRentLimit: number; // Daily limit eligible under policy (e.g. 5000)
  currentRoomCategory: string; // e.g. "Standard Single Private Room"
  currentRoomDailyRate: number; // e.g. 5000
  targetRoomCategory: string; // e.g. "Super Deluxe Suite"
  targetRoomDailyRate: number; // e.g. 12000
  stayDays: number; // e.g. 3
  estimatedAssociatedExpenses: number; // Doctor, surgeon, nursing, OT charges (e.g. 150000)
  estimatedProtectedExpenses?: number; // Pharmacy, lab diagnostics, implants (e.g. 40000)
}

export interface RoomUpgradeResult {
  policyDailyLimit: number;
  currentRoomCategory: string;
  targetRoomCategory: string;
  stayDays: number;
  directRoomRentDifferential: number;
  cascadedProportionateDeduction: number;
  totalAdditionalOutOfPocketCost: number;
  proportionateScalingFactor: number;
  financialImpactBreakdown: {
    directRoomRentCost: {
      billed: number;
      policyCovered: number;
      patientPays: number;
    };
    associatedMedicalExpenses: {
      estimatedTotal: number;
      policyCovered: number;
      patientPays: number;
    };
    protectedExpenses: {
      estimatedTotal: number;
      policyCovered: number;
      patientPays: number;
    };
  };
  explanation: string;
  assumptions: string[];
  decisionTrace: DecisionTraceItem;
  disclaimer: string;
}

export class RoomUpgradeService {
  simulate(input: RoomUpgradeInput): RoomUpgradeResult {
    const limit = Math.max(0, input.policyRoomRentLimit);
    const targetDaily = Math.max(0, input.targetRoomDailyRate);
    const days = Math.max(1, input.stayDays);
    const associated = Math.max(0, input.estimatedAssociatedExpenses);
    const protectedExp = Math.max(0, input.estimatedProtectedExpenses || 0);

    const isExceeded = targetDaily > limit && limit > 0;
    const ratio = isExceeded ? parseFloat((limit / targetDaily).toFixed(4)) : 1.0;

    // 1. Direct Room Difference
    const targetTotalRoomCost = targetDaily * days;
    const coveredRoomCost = Math.min(limit * days, targetTotalRoomCost);
    const directRoomRentDifferential = targetTotalRoomCost - coveredRoomCost;

    // 2. Cascaded Associated Medical Expenses
    const coveredAssociated = Math.round(associated * ratio);
    const cascadedDeduction = associated - coveredAssociated;

    // 3. Protected Expenses (IRDAI protects medicines/tests)
    const coveredProtected = protectedExp;
    const patientProtectedLiability = 0;

    // 4. Total Out of Pocket
    const totalAdditionalOutOfPocketCost = directRoomRentDifferential + cascadedDeduction;

    const steps: string[] = [
      `Evaluated Room Upgrade from '${input.currentRoomCategory}' (Rs. ${input.currentRoomDailyRate}/day) to '${input.targetRoomCategory}' (Rs. ${targetDaily}/day) for ${days} days.`,
      `Policy daily room rent limit: Rs. ${limit}/day. Total eligible room coverage = Rs. ${limit} * ${days} = Rs. ${coveredRoomCost}.`,
      `Direct Room Differential: Rs. ${targetTotalRoomCost} - Rs. ${coveredRoomCost} = Rs. ${directRoomRentDifferential}.`
    ];

    if (isExceeded) {
      steps.push(`Proportionate reduction ratio: ${limit} / ${targetDaily} = ${(ratio * 100).toFixed(2)}%.`);
      steps.push(`Associated Medical Expenses (Doctor, OT, Nursing): Rs. ${associated}. Policy pays ${(ratio * 100).toFixed(2)}% (Rs. ${coveredAssociated}). Patient absorbs Rs. ${cascadedDeduction}.`);
      steps.push(`Protected Expenses (Medicines, Consumables, Lab): Rs. ${protectedExp} are exempt from proportionate scaling under IRDAI guidelines.`);
    } else {
      steps.push(`Target room is within policy limits. No proportionate reduction applied.`);
    }

    steps.push(`Total projected patient out-of-pocket liability: Rs. ${totalAdditionalOutOfPocketCost}.`);

    const assumptions: string[] = [
      'Room rent capping triggers proportionate reduction only on associated fees (doctor, nursing, OT) as per IRDAI 2020 circular.',
      'Medicines, implants, and diagnostic tests are billed at standard MRP/hospital tariff without room-dependent markups.',
      'ICU days are evaluated separately under ICU limits if applicable.',
      'Final hospital tariff and billing structure may vary based on actual treatment.'
    ];

    const explanation = isExceeded
      ? `Upgrading to '${input.targetRoomCategory}' will cost an estimated Rs. ${totalAdditionalOutOfPocketCost} extra out-of-pocket: Rs. ${directRoomRentDifferential} in direct room difference, plus Rs. ${cascadedDeduction} in cascaded proportionate cuts on doctor and OT charges.`
      : `The selected room category '${input.targetRoomCategory}' is fully within your policy limit of Rs. ${limit}/day. No proportionate penalty applies.`;

    const decisionTrace: DecisionTraceItem = {
      ruleId: 'RULE_ROOM_UPGRADE_SIMULATOR_V1',
      description: 'Deterministic What-If Room Category Upgrade Impact Simulator',
      clauseReference: LEGAL_CLAUSE_REFERENCES.IRDAI_CIRCULAR_2020_ROOM_RENT,
      verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
      inputs: {
        policyRoomRentLimit: limit,
        targetRoomDailyRate: targetDaily,
        stayDays: days,
        associatedExpenses: associated,
        protectedExpenses: protectedExp
      },
      calculationSteps: steps,
      output: {
        directRoomRentDifferential,
        cascadedProportionateDeduction: cascadedDeduction,
        totalAdditionalOutOfPocketCost,
        proportionateRatio: ratio
      },
      timestamp: new Date().toISOString()
    };

    return {
      policyDailyLimit: limit,
      currentRoomCategory: input.currentRoomCategory,
      targetRoomCategory: input.targetRoomCategory,
      stayDays: days,
      directRoomRentDifferential,
      cascadedProportionateDeduction: cascadedDeduction,
      totalAdditionalOutOfPocketCost,
      proportionateScalingFactor: ratio,
      financialImpactBreakdown: {
        directRoomRentCost: {
          billed: targetTotalRoomCost,
          policyCovered: coveredRoomCost,
          patientPays: directRoomRentDifferential
        },
        associatedMedicalExpenses: {
          estimatedTotal: associated,
          policyCovered: coveredAssociated,
          patientPays: cascadedDeduction
        },
        protectedExpenses: {
          estimatedTotal: protectedExp,
          policyCovered: coveredProtected,
          patientPays: patientProtectedLiability
        }
      },
      explanation,
      assumptions,
      decisionTrace,
      disclaimer:
        'This calculation is an educational what-if simulator. Actual hospital settlement depends on insurer terms, hospital billing categories, and final bill audit.'
    };
  }
}

export const roomUpgradeService = new RoomUpgradeService();

