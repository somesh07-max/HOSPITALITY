import { DecisionTraceItem } from '../../types';
import { waitingPeriodService } from './waitingPeriod.service';
import { proportionateDeductionService, BillItemInput } from './proportionateDeduction.service';
import { LEGAL_CLAUSE_REFERENCES, VERIFICATION_STATUSES } from '../../constants';

export interface CoverageEvaluationInput {
  sumInsured: number;
  availableSumInsured?: number;
  inceptionDate: Date | string;
  treatmentDate: Date | string;
  diseaseName: string;
  isPreExisting?: boolean;
  isAccidental?: boolean;
  claimedAmount: number;
  roomRentDaily?: number;
  roomRentLimitDaily?: number;
  daysInHospital?: number;
  copayPercentage?: number;
  deductibleAmount?: number;
  policyExclusions?: string[];
  subLimits?: Array<{ category: string; limitAmount: number }>;
  billItems?: BillItemInput[];
}

export interface CalculationSummary {
  totalClaimedAmount: number;
  eligibleAmount: number;
  nonEligibleAmount: number;
  applicableDeductions: number;
  deductibleApplied: number;
  copaymentApplied: number;
  estimatedPayableAmount: number;
  remainingSumInsured: number;
  isEligibleForPayment: boolean;
  rejectionReason?: string;
  disclaimer: string;
}

export interface CoverageEvaluationResult {
  isCovered: boolean;
  summary: CalculationSummary;
  waitingPeriodAssessment: any;
  subLimitAssessment: {
    hasSublimit: boolean;
    appliedLimit?: number;
    excessDisallowed?: number;
  };
  decisionTraces: DecisionTraceItem[];
}

export class CoverageEvaluationService {
  evaluate(input: CoverageEvaluationInput): CoverageEvaluationResult {
    const traces: DecisionTraceItem[] = [];
    const totalClaimed = Math.max(0, input.claimedAmount);
    const availableSI = input.availableSumInsured !== undefined ? input.availableSumInsured : input.sumInsured;

    let eligibleAmount = totalClaimed;
    let nonEligibleAmount = 0;
    let totalDeductions = 0;
    let isCovered = true;
    let rejectionReason: string | undefined;

    // STEP 1: Waiting Period Evaluation
    const diseaseType = input.isAccidental
      ? 'ACCIDENT'
      : input.isPreExisting
      ? 'PRE_EXISTING'
      : 'INITIAL_ILLNESS';

    const wpResult = waitingPeriodService.checkEligibility({
      inceptionDate: input.inceptionDate,
      treatmentDate: input.treatmentDate,
      diseaseType,
      diseaseName: input.diseaseName,
      isPreExisting: input.isPreExisting
    });
    traces.push(wpResult.decisionTrace);

    if (!wpResult.isCovered) {
      isCovered = false;
      rejectionReason = wpResult.explanation;
      eligibleAmount = 0;
      nonEligibleAmount = totalClaimed;

      return {
        isCovered: false,
        summary: {
          totalClaimedAmount: totalClaimed,
          eligibleAmount: 0,
          nonEligibleAmount: totalClaimed,
          applicableDeductions: totalClaimed,
          deductibleApplied: 0,
          copaymentApplied: 0,
          estimatedPayableAmount: 0,
          remainingSumInsured: availableSI,
          isEligibleForPayment: false,
          rejectionReason,
          disclaimer:
            'Claim falls inside the applicable waiting period and is deterministically non-admissible under policy terms.'
        },
        waitingPeriodAssessment: wpResult,
        subLimitAssessment: { hasSublimit: false },
        decisionTraces: traces
      };
    }

    // STEP 2: Policy Exclusions Check
    const exclusions = input.policyExclusions || [];
    const matchedExclusion = exclusions.find(
      (ex) => input.diseaseName.toLowerCase().includes(ex.toLowerCase())
    );

    if (matchedExclusion) {
      isCovered = false;
      rejectionReason = `Treatment for '${input.diseaseName}' is listed under policy permanent exclusions (${matchedExclusion}).`;
      traces.push({
        ruleId: 'RULE_POLICY_EXCLUSIONS_MATCH',
        description: 'Exclusion list matching',
        clauseReference: 'Standard Health Policy Exclusion Schedule Clause 4.1',
        verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
        inputs: { diseaseName: input.diseaseName, matchedExclusion },
        calculationSteps: [`Matched disease against policy exclusion list: '${matchedExclusion}'.`],
        output: { isExcluded: true },
        timestamp: new Date().toISOString()
      });

      return {
        isCovered: false,
        summary: {
          totalClaimedAmount: totalClaimed,
          eligibleAmount: 0,
          nonEligibleAmount: totalClaimed,
          applicableDeductions: totalClaimed,
          deductibleApplied: 0,
          copaymentApplied: 0,
          estimatedPayableAmount: 0,
          remainingSumInsured: availableSI,
          isEligibleForPayment: false,
          rejectionReason,
          disclaimer: 'Treatment is an excluded ailment under the insurance policy wording.'
        },
        waitingPeriodAssessment: wpResult,
        subLimitAssessment: { hasSublimit: false },
        decisionTraces: traces
      };
    }

    // STEP 3: Proportionate Deductions / Bill Items
    if (input.billItems && input.billItems.length > 0) {
      const propResult = proportionateDeductionService.calculate({
        roomRentLimit: input.roomRentLimitDaily || 5000,
        actualRoomRent: input.roomRentDaily || 5000,
        roomDays: input.daysInHospital || 1,
        billItems: input.billItems
      });
      traces.push(propResult.decisionTrace);

      eligibleAmount = propResult.totalAllowedAmount;
      totalDeductions += propResult.totalProportionateDeduction;
    } else if (
      input.roomRentDaily &&
      input.roomRentLimitDaily &&
      input.roomRentDaily > input.roomRentLimitDaily
    ) {
      // Rough room rent excess deduction if no line items provided
      const excessDaily = input.roomRentDaily - input.roomRentLimitDaily;
      const days = input.daysInHospital || 1;
      const roomDeduction = excessDaily * days;
      totalDeductions += roomDeduction;
      eligibleAmount = Math.max(0, eligibleAmount - roomDeduction);

      traces.push({
        ruleId: 'RULE_ROOM_RENT_DIRECT_CAPPING',
        description: 'Direct room rent excess capping',
        clauseReference: LEGAL_CLAUSE_REFERENCES.IRDAI_CIRCULAR_2020_ROOM_RENT,
        verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
        inputs: { roomRentDaily: input.roomRentDaily, limit: input.roomRentLimitDaily, days },
        calculationSteps: [`Direct room rent capping: (${input.roomRentDaily} - ${input.roomRentLimitDaily}) * ${days} = Rs. ${roomDeduction}`],
        output: { roomDeduction },
        timestamp: new Date().toISOString()
      });
    }

    // STEP 4: Disease Specific Sub-Limits
    let sublimitExcess = 0;
    let hasSublimit = false;
    let appliedSublimitAmount: number | undefined;

    if (input.subLimits && input.subLimits.length > 0) {
      const matchedSublimit = input.subLimits.find((s) =>
        input.diseaseName.toLowerCase().includes(s.category.toLowerCase())
      );
      if (matchedSublimit) {
        hasSublimit = true;
        appliedSublimitAmount = matchedSublimit.limitAmount;
        if (eligibleAmount > matchedSublimit.limitAmount) {
          sublimitExcess = eligibleAmount - matchedSublimit.limitAmount;
          eligibleAmount = matchedSublimit.limitAmount;
          totalDeductions += sublimitExcess;

          traces.push({
            ruleId: 'RULE_DISEASE_SUBLIMIT_CAPPING',
            description: 'Disease-specific financial sub-limit capping',
            clauseReference: 'Policy Schedule Specific Illness Capping Clause',
            verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
            inputs: { disease: input.diseaseName, subLimit: matchedSublimit.limitAmount },
            calculationSteps: [
              `Condition '${input.diseaseName}' has a maximum sub-limit of Rs. ${matchedSublimit.limitAmount}.`,
              `Admissible charges capped from previous amount to Rs. ${matchedSublimit.limitAmount}. Capped deduction: Rs. ${sublimitExcess}.`
            ],
            output: { cappedAmount: matchedSublimit.limitAmount, excessDeducted: sublimitExcess },
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // STEP 5: Deductible
    let deductibleApplied = 0;
    const deductible = input.deductibleAmount || 0;
    if (deductible > 0 && eligibleAmount > 0) {
      deductibleApplied = Math.min(eligibleAmount, deductible);
      eligibleAmount = Math.max(0, eligibleAmount - deductibleApplied);

      traces.push({
        ruleId: 'RULE_POLICY_DEDUCTIBLE',
        description: 'Policy deductible threshold application',
        clauseReference: 'Standard Health Policy Deductible Clause',
        verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
        inputs: { policyDeductible: deductible, preDeductibleAdmissible: eligibleAmount + deductibleApplied },
        calculationSteps: [`Applied deductible threshold of Rs. ${deductibleApplied} to admissible claim.`],
        output: { deductibleApplied, postDeductibleAmount: eligibleAmount },
        timestamp: new Date().toISOString()
      });
    }

    // STEP 6: Co-payment
    let copayApplied = 0;
    const copayPct = input.copayPercentage || 0;
    if (copayPct > 0 && eligibleAmount > 0) {
      copayApplied = Math.round(eligibleAmount * (copayPct / 100));
      eligibleAmount = Math.max(0, eligibleAmount - copayApplied);

      traces.push({
        ruleId: 'RULE_POLICY_COPAYMENT',
        description: 'Co-payment percentage cost sharing',
        clauseReference: 'Standard Health Policy Co-payment Clause',
        verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
        inputs: { copayPercentage: copayPct, admissibleBeforeCopay: eligibleAmount + copayApplied },
        calculationSteps: [
          `Applied ${copayPct}% co-payment: ${eligibleAmount + copayApplied} * ${copayPct}% = Rs. ${copayApplied}.`,
          `Payable amount after co-pay: Rs. ${eligibleAmount}.`
        ],
        output: { copayApplied, postCopayAmount: eligibleAmount },
        timestamp: new Date().toISOString()
      });
    }

    // STEP 7: Sum Insured Capping
    const payableAmount = Math.min(eligibleAmount, availableSI);
    const remainingSI = Math.max(0, availableSI - payableAmount);
    nonEligibleAmount = totalClaimed - payableAmount;

    traces.push({
      ruleId: 'RULE_SUM_INSURED_AVAILABILITY',
      description: 'Sum insured exhaustion check',
      clauseReference: 'Policy Sum Insured Limits Clause',
      verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
      inputs: { availableSumInsured: availableSI, preCapPayable: eligibleAmount },
      calculationSteps: [
        `Available Sum Insured: Rs. ${availableSI}. Net payable calculated: Rs. ${eligibleAmount}.`,
        `Final estimated payout capped at available sum insured: Rs. ${payableAmount}.`,
        `Remaining Sum Insured balance: Rs. ${remainingSI}.`
      ],
      output: { payableAmount, remainingSI },
      timestamp: new Date().toISOString()
    });

    return {
      isCovered: true,
      summary: {
        totalClaimedAmount: totalClaimed,
        eligibleAmount,
        nonEligibleAmount,
        applicableDeductions: totalDeductions,
        deductibleApplied,
        copaymentApplied: copayApplied,
        estimatedPayableAmount: payableAmount,
        remainingSumInsured: remainingSI,
        isEligibleForPayment: payableAmount > 0,
        disclaimer:
          'Estimates are generated deterministically based on explicit policy clauses and IRDAI regulations. Calculations do not guarantee final insurer settlement.'
      },
      waitingPeriodAssessment: wpResult,
      subLimitAssessment: {
        hasSublimit,
        appliedLimit: appliedSublimitAmount,
        excessDisallowed: sublimitExcess
      },
      decisionTraces: traces
    };
  }
}

export const coverageEvaluationService = new CoverageEvaluationService();

