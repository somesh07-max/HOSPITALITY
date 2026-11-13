import { DecisionTraceItem } from '../../types';
import { LEGAL_CLAUSE_REFERENCES, VERIFICATION_STATUSES } from '../../constants';

export interface WaitingPeriodCheckInput {
  inceptionDate: Date | string;
  treatmentDate: Date | string;
  renewalDate?: Date | string;
  diseaseType: 'ACCIDENT' | 'INITIAL_ILLNESS' | 'SPECIFIC_DISEASE' | 'PRE_EXISTING';
  diseaseName?: string;
  isPreExisting?: boolean;
  initialWaitingDays?: number; // default 30
  specificDiseaseMonths?: number; // default 24
  pedWaitingMonths?: number; // default 36 or 48
}

export interface WaitingPeriodCheckResult {
  isCovered: boolean;
  waitingPeriodType: string;
  requiredWaitingDays: number;
  requiredWaitingMonths: number;
  continuousCoverageStartDate: string;
  treatmentDate: string;
  completionDate: string;
  elapsedDays: number;
  elapsedMonths: number;
  daysRemaining: number;
  explanation: string;
  decisionTrace: DecisionTraceItem;
}

export class WaitingPeriodService {
  private addDays(date: Date, days: number): Date {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date.getTime());
    result.setMonth(result.getMonth() + months);
    return result;
  }

  checkEligibility(input: WaitingPeriodCheckInput): WaitingPeriodCheckResult {
    const inception = new Date(input.inceptionDate);
    const treatment = new Date(input.treatmentDate);

    if (isNaN(inception.getTime()) || isNaN(treatment.getTime())) {
      throw new Error('Invalid date provided for inceptionDate or treatmentDate');
    }

    // In Indian health insurance, continuity is preserved from original inception date
    const continuousStartDate = inception;
    const diffTime = treatment.getTime() - continuousStartDate.getTime();
    const elapsedDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    const elapsedMonths = parseFloat((elapsedDays / 30.4375).toFixed(1));

    const initialDays = input.initialWaitingDays ?? 30;
    const specificMonths = input.specificDiseaseMonths ?? 24;
    const pedMonths = input.pedWaitingMonths ?? 36;

    let isCovered = false;
    let completionDate: Date;
    let requiredDays = 0;
    let requiredMonths = 0;
    let clauseRef: string = LEGAL_CLAUSE_REFERENCES.IRDAI_STANDARDIZATION_CLAUSE_3_1;
    let ruleId = 'RULE_WAITING_PERIOD_INITIAL';
    let explanation = '';
    const steps: string[] = [];

    // ACCIDENT WAIVER RULE
    if (input.diseaseType === 'ACCIDENT') {
      isCovered = treatment >= continuousStartDate;
      completionDate = continuousStartDate;
      requiredDays = 0;
      requiredMonths = 0;
      ruleId = 'RULE_ACCIDENT_WAITING_PERIOD_WAIVER';
      clauseRef = 'IRDAI Health Insurance Guidelines - Accidental Injury Exemption';
      steps.push('Condition identified as accidental injury.');
      steps.push('Standard 30-day initial waiting period waived under IRDAI accidental emergency clause.');
      explanation = isCovered
        ? 'Accidental injuries are covered immediately from day 1 without waiting periods.'
        : 'Treatment occurred prior to policy inception.';
    }
    // PRE-EXISTING DISEASE (PED) RULE
    else if (input.diseaseType === 'PRE_EXISTING' || input.isPreExisting) {
      requiredMonths = pedMonths;
      completionDate = this.addMonths(continuousStartDate, requiredMonths);
      requiredDays = Math.floor((completionDate.getTime() - continuousStartDate.getTime()) / (1000 * 60 * 60 * 24));
      isCovered = treatment >= completionDate;
      ruleId = 'RULE_WAITING_PERIOD_PED';
      clauseRef = 'IRDAI Master Circular Clause 4.3 - Pre-Existing Diseases Waiting Period (Max 36 Months as per 2024 IRDAI reforms)';
      steps.push(`Condition identified as Pre-Existing Disease: ${input.diseaseName || 'Declared Condition'}.`);
      steps.push(`Required PED waiting period: ${requiredMonths} months (${requiredDays} days).`);
      steps.push(`Continuous coverage active for: ${elapsedDays} days (${elapsedMonths} months).`);

      const daysLeft = Math.max(0, Math.floor((completionDate.getTime() - treatment.getTime()) / (1000 * 60 * 60 * 24)));
      if (isCovered) {
        steps.push('Elapsed time satisfies or exceeds required waiting period.');
        explanation = `PED waiting period of ${requiredMonths} months successfully completed on ${completionDate.toISOString().split('T')[0]}.`;
      } else {
        steps.push(`Elapsed time is less than required waiting period (${daysLeft} days remaining).`);
        explanation = `PED waiting period active. ${daysLeft} days remaining until coverage commences on ${completionDate.toISOString().split('T')[0]}.`;
      }
    }
    // SPECIFIC DISEASE RULE
    else if (input.diseaseType === 'SPECIFIC_DISEASE') {
      requiredMonths = specificMonths;
      completionDate = this.addMonths(continuousStartDate, requiredMonths);
      requiredDays = Math.floor((completionDate.getTime() - continuousStartDate.getTime()) / (1000 * 60 * 60 * 24));
      isCovered = treatment >= completionDate;
      ruleId = 'RULE_WAITING_PERIOD_SPECIFIC_DISEASE';
      clauseRef = 'IRDAI Standard Health Policy Terms - Specific Illness Waiting Period (24 Months)';
      steps.push(`Condition identified under 2-Year Specific Disease List: ${input.diseaseName || 'Specified Ailment'}.`);
      steps.push(`Required waiting period: ${requiredMonths} months (${requiredDays} days).`);
      steps.push(`Elapsed coverage: ${elapsedDays} days (${elapsedMonths} months).`);

      const daysLeft = Math.max(0, Math.floor((completionDate.getTime() - treatment.getTime()) / (1000 * 60 * 60 * 24)));
      if (isCovered) {
        steps.push('Elapsed time satisfies specific disease waiting period.');
        explanation = `Specific disease waiting period of ${requiredMonths} months completed on ${completionDate.toISOString().split('T')[0]}.`;
      } else {
        steps.push(`Treatment occurred before completion (${daysLeft} days remaining).`);
        explanation = `Specific disease waiting period active. Coverage for ${input.diseaseName || 'this condition'} unlocks on ${completionDate.toISOString().split('T')[0]}.`;
      }
    }
    // INITIAL 30-DAY WAITING PERIOD RULE
    else {
      requiredDays = initialDays;
      completionDate = this.addDays(continuousStartDate, requiredDays);
      isCovered = treatment >= completionDate;
      ruleId = 'RULE_WAITING_PERIOD_INITIAL_30_DAYS';
      clauseRef = 'IRDAI Standard Health Regulations - Initial 30-Day Waiting Period';
      steps.push(`Standard illness waiting period evaluated.`);
      steps.push(`Required initial waiting period: ${requiredDays} days.`);
      steps.push(`Elapsed coverage: ${elapsedDays} days.`);

      const daysLeft = Math.max(0, Math.floor((completionDate.getTime() - treatment.getTime()) / (1000 * 60 * 60 * 24)));
      if (isCovered) {
        steps.push('Initial 30-day waiting period has elapsed.');
        explanation = `Initial waiting period of ${requiredDays} days completed on ${completionDate.toISOString().split('T')[0]}.`;
      } else {
        steps.push(`Illness occurred during initial 30 days (${daysLeft} days remaining).`);
        explanation = `Treatment falls inside the initial ${requiredDays}-day waiting period (${daysLeft} days remaining).`;
      }
    }

    const daysRemaining = Math.max(0, Math.floor((completionDate.getTime() - treatment.getTime()) / (1000 * 60 * 60 * 24)));

    const decisionTrace: DecisionTraceItem = {
      ruleId,
      description: 'Deterministic health insurance waiting period evaluation',
      clauseReference: clauseRef,
      verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
      inputs: {
        continuousStartDate: continuousStartDate.toISOString(),
        treatmentDate: treatment.toISOString(),
        diseaseType: input.diseaseType,
        diseaseName: input.diseaseName,
        requiredWaitingMonths: requiredMonths,
        requiredWaitingDays: requiredDays
      },
      calculationSteps: steps,
      output: {
        isCovered,
        completionDate: completionDate.toISOString(),
        elapsedDays,
        daysRemaining
      },
      timestamp: new Date().toISOString()
    };

    return {
      isCovered,
      waitingPeriodType: input.diseaseType,
      requiredWaitingDays: requiredDays,
      requiredWaitingMonths: requiredMonths,
      continuousCoverageStartDate: continuousStartDate.toISOString(),
      treatmentDate: treatment.toISOString(),
      completionDate: completionDate.toISOString(),
      elapsedDays,
      elapsedMonths,
      daysRemaining,
      explanation,
      decisionTrace
    };
  }
}

export const waitingPeriodService = new WaitingPeriodService();

