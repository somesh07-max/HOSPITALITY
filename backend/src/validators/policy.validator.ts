import { z } from 'zod';
import {
  POLICY_TYPES,
  CONFIRMATION_STATUS,
  FIELD_CONFIRMATION_STATUS,
  DOCUMENT_TYPES
} from '../constants';

const memberSchema = z.object({
  name: z.string().min(1, 'Member name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  age: z.number().min(0).max(120),
  dob: z.string().or(z.date()).optional()
});

const roomRentLimitSchema = z.object({
  limitType: z.enum(['PERCENTAGE', 'FIXED', 'NO_LIMIT']).default('NO_LIMIT'),
  percentage: z.number().min(0).max(100).optional().default(0),
  dailyLimit: z.number().min(0).optional().default(0),
  icuDailyLimit: z.number().min(0).optional().default(0)
}).optional().default({ limitType: 'NO_LIMIT', percentage: 0, dailyLimit: 0, icuDailyLimit: 0 });

const copaymentSchema = z.object({
  hasCopay: z.boolean().default(false),
  percentage: z.number().min(0).max(100).default(0),
  appliesTo: z.enum(['ALL', 'ZONE', 'SENIOR', 'SPECIAL_HOSPITALS', 'NONE']).default('NONE'),
  remarks: z.string().optional()
}).optional().default({ hasCopay: false, percentage: 0, appliesTo: 'NONE' });

const deductibleSchema = z.object({
  hasDeductible: z.boolean().default(false),
  amount: z.number().min(0).default(0),
  deductibleType: z.enum(['PER_CLAIM', 'PER_YEAR']).default('PER_CLAIM')
}).optional().default({ hasDeductible: false, amount: 0, deductibleType: 'PER_CLAIM' });

const waitingPeriodsSchema = z.object({
  initialWaitingPeriodDays: z.number().min(0).default(30),
  specificDiseaseMonths: z.number().min(0).default(24),
  preExistingDiseaseMonths: z.number().min(0).default(36)
}).optional().default({ initialWaitingPeriodDays: 30, specificDiseaseMonths: 24, preExistingDiseaseMonths: 36 });

export const createPolicySchema = z.object({
  insurerName: z.string().min(2, 'Insurer name is required'),
  policyName: z.string().min(2, 'Policy name is required'),
  policyNumber: z.string().min(2, 'Policy number is required'),
  policyType: z.enum([POLICY_TYPES.INDIVIDUAL, POLICY_TYPES.FAMILY_FLOATER]).default(POLICY_TYPES.INDIVIDUAL),
  sumInsured: z.number().positive('Sum insured must be greater than 0'),
  premium: z.number().min(0).optional(),
  inceptionDate: z.string().or(z.date()).transform((val) => new Date(val)),
  expiryDate: z.string().or(z.date()).transform((val) => new Date(val)),
  renewalDate: z.string().or(z.date()).optional().transform((val) => (val ? new Date(val) : undefined)),
  membersCovered: z.array(memberSchema).optional().default([]),
  roomRentLimit: roomRentLimitSchema,
  copayment: copaymentSchema,
  deductible: deductibleSchema,
  waitingPeriods: waitingPeriodsSchema,
  diseaseSpecificRestrictions: z.array(
    z.object({
      diseaseName: z.string().min(1),
      sublimitAmount: z.number().optional(),
      waitingPeriodMonths: z.number().optional()
    })
  ).optional().default([]),
  exclusions: z.array(z.string()).optional().default([]),
  subLimits: z.array(
    z.object({
      category: z.string().min(1),
      limitAmount: z.number().positive(),
      clauseRef: z.string().optional()
    })
  ).optional().default([]),
  restorationBenefit: z.object({
    isAvailable: z.boolean().default(false),
    percentage: z.number().default(0),
    triggers: z.string().optional()
  }).optional().default({ isAvailable: false, percentage: 0 }),
  networkHospitalInfo: z.record(z.any()).optional()
});

export const updatePolicySchema = createPolicySchema.partial();

export const confirmPolicySchema = z.object({
  fieldConfirmations: z.array(
    z.object({
      fieldName: z.string().min(1, 'Field name is required'),
      status: z.enum([
        FIELD_CONFIRMATION_STATUS.UNCONFIRMED,
        FIELD_CONFIRMATION_STATUS.CONFIRMED,
        FIELD_CONFIRMATION_STATUS.NEEDS_CORRECTION
      ]),
      notes: z.string().optional(),
      sourceDocumentId: z.string().optional(),
      sourcePage: z.number().int().positive().optional()
    })
  ).optional().default([]),
  markAllConfirmed: z.boolean().optional().default(false)
});

export const documentUploadQuerySchema = z.object({
  documentType: z.enum([
    DOCUMENT_TYPES.POLICY_SCHEDULE,
    DOCUMENT_TYPES.POLICY_WORDING,
    DOCUMENT_TYPES.RENEWAL_RECEIPT,
    DOCUMENT_TYPES.OTHER
  ]).optional().default(DOCUMENT_TYPES.POLICY_SCHEDULE)
});

export type CreatePolicyDto = z.infer<typeof createPolicySchema>;
export type UpdatePolicyDto = z.infer<typeof updatePolicySchema>;
export type ConfirmPolicyDto = z.infer<typeof confirmPolicySchema>;

