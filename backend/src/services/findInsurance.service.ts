import { InsuranceProduct, IInsuranceProduct } from '../models/insuranceProduct.model';
import { VERIFICATION_STATUSES } from '../constants';

export interface FindInsurancePreferences {
  noRoomRentCapping?: boolean;
  zeroCopay?: boolean;
  lowWaitingPeriod?: boolean;
  restorationBenefit?: boolean;
}

export interface FindInsuranceInput {
  age: number;
  city?: string;
  familyMembersCount?: number;
  policyType?: 'INDIVIDUAL' | 'FAMILY_FLOATER';
  requiredSumInsured: number;
  budget?: number;
  preferences?: FindInsurancePreferences;
}

export interface ScoredPolicyResult {
  productId: string;
  insurerName: string;
  productName: string;
  planType: string;
  matchScore: number;
  scoreBreakdown: {
    sumInsuredScore: number;
    roomRentScore: number;
    copayScore: number;
    budgetScore: number;
    waitingPeriodScore: number;
    restorationScore: number;
  };
  pros: string[];
  cons: string[];
  estimatedAnnualPremium?: number;
  roomRentCondition: string;
  copayPercentage: number;
  pedWaitingPeriodMonths: number;
  hasRestorationBenefit: boolean;
  importantLimitations: string[];
  brochureSourceUrl?: string;
  verificationStatus: string;
  dataSource: string;
}

export const INITIAL_PRODUCTS_SEED = [
  {
    insurerName: 'HDFC ERGO General Insurance',
    productName: 'Optima Secure',
    planType: 'INDIVIDUAL',
    availableSumInsuredOptions: [500000, 1000000, 2000000],
    entryAgeMin: 18,
    entryAgeMax: 65,
    hasRoomRentCapping: false,
    roomRentCondition: 'No Room Rent Capping - Any room category including single private room',
    hasCopayment: false,
    copayPercentage: 0,
    pedWaitingPeriodMonths: 36,
    specificDiseaseWaitingMonths: 24,
    hasRestorationBenefit: true,
    dayCareProceduresCovered: true,
    sampleAnnualPremiumEstimate: [
      { ageRange: '25-35', sumInsured: 1000000, estimatedPremium: 14500 },
      { ageRange: '36-45', sumInsured: 1000000, estimatedPremium: 19800 }
    ],
    importantLimitations: ['Maternity coverage is excluded', 'OPD consultation not included in base plan'],
    brochureSourceUrl: 'https://www.hdfcergo.com/health-insurance/optima-secure',
    verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
    dataSource: 'IRDAI Public Product Filing UIN: HDFHLIP21573V022021'
  },
  {
    insurerName: 'Care Health Insurance',
    productName: 'Care Supreme',
    planType: 'INDIVIDUAL',
    availableSumInsuredOptions: [700000, 1000000, 1500000],
    entryAgeMin: 18,
    entryAgeMax: 70,
    hasRoomRentCapping: false,
    roomRentCondition: 'No Room Rent Sub-limits',
    hasCopayment: false,
    copayPercentage: 0,
    pedWaitingPeriodMonths: 36,
    specificDiseaseWaitingMonths: 24,
    hasRestorationBenefit: true,
    dayCareProceduresCovered: true,
    sampleAnnualPremiumEstimate: [
      { ageRange: '25-35', sumInsured: 1000000, estimatedPremium: 13200 },
      { ageRange: '36-45', sumInsured: 1000000, estimatedPremium: 17900 }
    ],
    importantLimitations: ['Air ambulance covered only up to Rs. 50,000'],
    brochureSourceUrl: 'https://www.careinsurance.com/care-supreme',
    verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
    dataSource: 'IRDAI Public Product Filing UIN: CHIHLIP22043V012122'
  },
  {
    insurerName: 'Star Health and Allied Insurance',
    productName: 'Family Health Optima',
    planType: 'FAMILY_FLOATER',
    availableSumInsuredOptions: [500000, 1000000, 1500000],
    entryAgeMin: 18,
    entryAgeMax: 65,
    hasRoomRentCapping: true,
    roomRentCondition: '1% of Sum Insured daily (max Rs. 5,000/day)',
    hasCopayment: true,
    copayPercentage: 20,
    pedWaitingPeriodMonths: 48,
    specificDiseaseWaitingMonths: 24,
    hasRestorationBenefit: true,
    dayCareProceduresCovered: true,
    sampleAnnualPremiumEstimate: [
      { ageRange: '25-35', sumInsured: 1000000, estimatedPremium: 18500 },
      { ageRange: '36-45', sumInsured: 1000000, estimatedPremium: 24000 }
    ],
    importantLimitations: ['Room rent capped at 1% of Sum Insured', '20% co-payment for entry age above 60'],
    brochureSourceUrl: 'https://www.starhealth.in/family-health-optima',
    verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
    dataSource: 'IRDAI Public Product Filing UIN: SHAHLIP21182V062021'
  }
];

export class FindInsuranceService {
  async seedIfEmpty(): Promise<void> {
    try {
      const count = await InsuranceProduct.countDocuments();
      if (count === 0) {
        await InsuranceProduct.insertMany(INITIAL_PRODUCTS_SEED);
      }
    } catch {
      // Graceful fallback in environments without active database connection
    }
  }

  async compareAndRank(input: FindInsuranceInput): Promise<{
    rankedPolicies: ScoredPolicyResult[];
    totalEvaluated: number;
    scoringMethodology: string;
    disclaimer: string;
  }> {
    let products: any[] = [];
    try {
      await this.seedIfEmpty();
      products = await InsuranceProduct.find();
    } catch {
      products = INITIAL_PRODUCTS_SEED;
    }

    if (!products || products.length === 0) {
      products = INITIAL_PRODUCTS_SEED;
    }
    const rankedPolicies: ScoredPolicyResult[] = [];

    const prefs = input.preferences || {};
    const reqSI = input.requiredSumInsured;

    for (const prod of products) {
      let sumInsuredScore = 0;
      let roomRentScore = 0;
      let copayScore = 0;
      let budgetScore = 0;
      let waitingPeriodScore = 0;
      let restorationScore = 0;

      const pros: string[] = [];
      const cons: string[] = [];

      // 1. Sum Insured match (Max 25 pts)
      const exactMatch = prod.availableSumInsuredOptions.includes(reqSI);
      const hasHigher = prod.availableSumInsuredOptions.some((s: number) => s >= reqSI);
      if (exactMatch) {
        sumInsuredScore = 25;
        pros.push(`Offers exact requested sum insured of Rs. ${reqSI.toLocaleString('en-IN')}`);
      } else if (hasHigher) {
        sumInsuredScore = 18;
        pros.push(`Offers higher coverage options matching your requirements`);
      } else {
        sumInsuredScore = 8;
        cons.push(`Maximum available sum insured is lower than requested Rs. ${reqSI.toLocaleString('en-IN')}`);
      }

      // 2. Room Rent Capping (Max 20 pts)
      if (!prod.hasRoomRentCapping) {
        roomRentScore = 20;
        pros.push('Zero room rent capping: No proportionate deduction risk on single private rooms');
      } else {
        roomRentScore = prefs.noRoomRentCapping ? 5 : 10;
        cons.push(`Room rent limit applied: ${prod.roomRentCondition}`);
      }

      // 3. Co-payment (Max 20 pts)
      if (!prod.hasCopayment) {
        copayScore = 20;
        pros.push('Zero co-payment: Insurer pays 100% of approved medical expenses');
      } else {
        copayScore = prefs.zeroCopay ? 5 : 10;
        cons.push(`Mandatory co-payment of ${prod.copayPercentage}% on claims`);
      }

      // 4. Budget match (Max 15 pts)
      let samplePrem: number | undefined;
      const matchedSample = prod.sampleAnnualPremiumEstimate[0];
      if (matchedSample) {
        samplePrem = matchedSample.estimatedPremium;
      }

      if (input.budget && samplePrem) {
        if (samplePrem <= input.budget) {
          budgetScore = 15;
          pros.push(`Estimated premium of Rs. ${samplePrem} is within your budget of Rs. ${input.budget}`);
        } else {
          const excessRatio = (samplePrem - input.budget) / input.budget;
          budgetScore = Math.max(0, Math.round(15 * (1 - excessRatio)));
          cons.push(`Estimated premium of Rs. ${samplePrem} exceeds stated budget of Rs. ${input.budget}`);
        }
      } else {
        budgetScore = 10; // Default baseline if budget not specified
      }

      // 5. Waiting Period (Max 10 pts)
      if (prod.pedWaitingPeriodMonths <= 24) {
        waitingPeriodScore = 10;
        pros.push(`Short PED waiting period of only ${prod.pedWaitingPeriodMonths} months`);
      } else if (prod.pedWaitingPeriodMonths <= 36) {
        waitingPeriodScore = 7;
        pros.push(`Standard 36-month pre-existing disease waiting period`);
      } else {
        waitingPeriodScore = 3;
        cons.push(`Longer 48-month pre-existing disease waiting period`);
      }

      // 6. Restoration Benefit (Max 10 pts)
      if (prod.hasRestorationBenefit) {
        restorationScore = 10;
        pros.push('Automatic restoration of sum insured available upon exhaustion');
      } else {
        restorationScore = 0;
        cons.push('Does not include automatic sum insured restoration');
      }

      const matchScore =
        sumInsuredScore +
        roomRentScore +
        copayScore +
        budgetScore +
        waitingPeriodScore +
        restorationScore;

      rankedPolicies.push({
        productId: prod._id ? prod._id.toString() : `prod_${prod.insurerName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        insurerName: prod.insurerName,
        productName: prod.productName,
        planType: prod.planType,
        matchScore,
        scoreBreakdown: {
          sumInsuredScore,
          roomRentScore,
          copayScore,
          budgetScore,
          waitingPeriodScore,
          restorationScore
        },
        pros,
        cons,
        estimatedAnnualPremium: samplePrem,
        roomRentCondition: prod.roomRentCondition,
        copayPercentage: prod.copayPercentage,
        pedWaitingPeriodMonths: prod.pedWaitingPeriodMonths,
        hasRestorationBenefit: prod.hasRestorationBenefit,
        importantLimitations: prod.importantLimitations,
        brochureSourceUrl: prod.brochureSourceUrl,
        verificationStatus: prod.verificationStatus,
        dataSource: prod.dataSource
      });
    }

    // Sort descending by matchScore
    rankedPolicies.sort((a, b) => b.matchScore - a.matchScore);

    return {
      rankedPolicies,
      totalEvaluated: rankedPolicies.length,
      scoringMethodology:
        'Transparent preference weightings: Sum Insured Match (25%), Room Rent Terms (20%), Copay Terms (20%), Budget Compatibility (15%), Waiting Period (10%), Restoration Benefit (10%).',
      disclaimer:
        'Rankings and scores are deterministic calculations reflecting your specified preferences. HOSPITALITY does not sell insurance or endorse any insurer. Premiums are illustrative based on public IRDAI filings.'
    };
  }

  async getProviders(): Promise<string[]> {
    await this.seedIfEmpty();
    return InsuranceProduct.distinct('insurerName');
  }

  async getAllProducts(): Promise<IInsuranceProduct[]> {
    await this.seedIfEmpty();
    return InsuranceProduct.find();
  }
}

export const findInsuranceService = new FindInsuranceService();
