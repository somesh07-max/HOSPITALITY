import { Types } from 'mongoose';
import { BillAudit, IBillAudit, IAuditItem, IAuditFinding } from '../models/billAudit.model';
import { Policy } from '../models/policy.model';
import { AppError } from '../middleware/errorHandler';
import { LEGAL_CLAUSE_REFERENCES } from '../constants';

export interface RawBillItem {
  description: string;
  category: string;
  amount: number;
  itemDate?: string;
}

export interface PerformAuditInput {
  policyId: string;
  claimId?: string;
  declaredTotalAmount?: number;
  items: RawBillItem[];
}

// Standard IRDAI Non-Payable Consumables List (Items not covered under health insurance)
const NON_PAYABLE_KEYWORDS = [
  'ppe kit',
  'gloves',
  'sanitizer',
  'thermometer',
  'admission fee',
  'registration fee',
  'discharge card charge',
  'administrative charge',
  'dietitian fee',
  'luxury kit',
  'toiletries',
  'face mask',
  'cotton wool',
  'syringes disposable extra',
  'bedsheet change extra'
];

export class BillAuditService {
  async performAudit(userId: string, input: PerformAuditInput): Promise<IBillAudit> {
    const policy = await Policy.findOne({
      _id: new Types.ObjectId(input.policyId),
      userId: new Types.ObjectId(userId)
    });

    if (!policy) {
      throw new AppError('Associated policy not found or does not belong to you', 404, 'POLICY_NOT_FOUND');
    }

    const findings: IAuditFinding[] = [];
    const auditedItems: IAuditItem[] = [];

    let totalBilled = 0;
    let totalAllowed = 0;
    let totalDeductions = 0;

    // Track duplicates by description normalized + amount
    const seenItems = new Map<string, number>();

    // Process line items
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const billed = Math.max(0, item.amount);
      totalBilled += billed;

      const normDesc = item.description.trim().toLowerCase();
      const itemSignature = `${normDesc}_${billed}`;

      let isCovered = true;
      let allowed = billed;
      let deducted = 0;
      let reason: string | undefined;
      let ruleRef: string | undefined;

      // 1. Check for Duplicate billing
      if (seenItems.has(itemSignature)) {
        const previousIndex = seenItems.get(itemSignature)! + 1;
        isCovered = false;
        allowed = 0;
        deducted = billed;
        reason = `Potential duplicate billing: identical to line item #${previousIndex}.`;
        ruleRef = 'IRDAI Claims Audit Norms - Anti-Duplicate Billing Verification';

        findings.push({
          severity: 'CRITICAL',
          code: 'DUPLICATE_BILL_ITEM',
          message: `Line item '${item.description}' (Rs. ${billed}) appears multiple times in the bill.`,
          financialImpact: billed
        });
      } else {
        seenItems.set(itemSignature, i);

        // 2. Check for Non-Payable Consumables
        const isNonPayable =
          item.category.toUpperCase().includes('CONSUMABLE') ||
          NON_PAYABLE_KEYWORDS.some((kw) => normDesc.includes(kw));

        if (isNonPayable) {
          isCovered = false;
          allowed = 0;
          deducted = billed;
          reason = 'Disallowed: Listed under standard IRDAI non-payable consumables and hospital overheads.';
          ruleRef = 'IRDAI Health Insurance Guidelines - Schedule of Non-Admissible Expenses';

          findings.push({
            severity: 'WARNING',
            code: 'NON_PAYABLE_CONSUMABLE',
            message: `Line item '${item.description}' (Rs. ${billed}) is non-payable under standard policy terms.`,
            financialImpact: billed
          });
        }
      }

      totalAllowed += allowed;
      totalDeductions += deducted;

      auditedItems.push({
        description: item.description,
        category: item.category,
        billedAmount: billed,
        allowedAmount: allowed,
        deductedAmount: deducted,
        isCovered,
        deductionReason: reason,
        ruleReference: ruleRef
      });
    }

    // 3. Inconsistent Total Check
    if (input.declaredTotalAmount !== undefined && input.declaredTotalAmount !== totalBilled) {
      findings.push({
        severity: 'WARNING',
        code: 'TOTAL_AMOUNT_MISMATCH',
        message: `Sum of line items (Rs. ${totalBilled}) does not match the hospital declared bill total (Rs. ${input.declaredTotalAmount}). Discrepancy of Rs. ${Math.abs(input.declaredTotalAmount - totalBilled)}.`,
        financialImpact: Math.abs(input.declaredTotalAmount - totalBilled)
      });
    }

    // 4. Copayment or Deductible application on eligible amount
    let finalPayable = totalAllowed;
    if (policy.copayment?.hasCopay && policy.copayment.percentage > 0 && finalPayable > 0) {
      const copayCut = Math.round(finalPayable * (policy.copayment.percentage / 100));
      finalPayable = Math.max(0, finalPayable - copayCut);
      findings.push({
        severity: 'INFO',
        code: 'POLICY_COPAY_APPLIED',
        message: `Applied policy co-payment of ${policy.copayment.percentage}%. Patient cost share: Rs. ${copayCut}.`,
        financialImpact: copayCut
      });
    }

    // Cap at sum insured
    if (finalPayable > policy.sumInsured) {
      const siCut = finalPayable - policy.sumInsured;
      finalPayable = policy.sumInsured;
      findings.push({
        severity: 'WARNING',
        code: 'SUM_INSURED_EXHAUSTION',
        message: `Total admissible expenses exceed total policy sum insured of Rs. ${policy.sumInsured}.`,
        financialImpact: siCut
      });
    }

    const billAudit = await BillAudit.create({
      userId: new Types.ObjectId(userId),
      policyId: policy._id,
      claimId: input.claimId ? new Types.ObjectId(input.claimId) : undefined,
      totalBilledAmount: totalBilled,
      eligibleAmount: totalAllowed,
      nonEligibleAmount: totalBilled - finalPayable,
      estimatedPayableAmount: finalPayable,
      items: auditedItems,
      findings,
      auditedAt: new Date()
    });

    return billAudit;
  }

  async getAuditById(auditId: string, userId: string, isAdmin = false): Promise<IBillAudit> {
    const query: any = { _id: new Types.ObjectId(auditId) };
    if (!isAdmin) {
      query.userId = new Types.ObjectId(userId);
    }

    const audit = await BillAudit.findOne(query)
      .populate('policyId', 'insurerName policyName policyNumber sumInsured')
      .populate('claimId', 'claimNumber currentStage');

    if (!audit) {
      throw new AppError('Bill audit record not found or access denied', 404, 'AUDIT_NOT_FOUND');
    }
    return audit;
  }
}

export const billAuditService = new BillAuditService();

