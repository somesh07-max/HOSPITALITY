import { z } from 'zod';
import {
  REJECTION_CATEGORIES,
  REVIEW_CATEGORIES,
  SHAREABLE_RESOURCE_TYPES,
  MODERATION_STATUSES
} from '../constants';

export const billAuditSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  claimId: z.string().optional(),
  declaredTotalAmount: z.number().min(0).optional(),
  items: z.array(
    z.object({
      description: z.string().min(1, 'Item description is required'),
      category: z.string().min(1, 'Item category is required'),
      amount: z.number().min(0, 'Amount must be non-negative'),
      itemDate: z.string().optional()
    })
  ).min(1, 'At least one bill item is required for audit')
});

export const recordRejectionSchema = z.object({
  claimId: z.string().min(1, 'Claim ID is required'),
  claimedAmount: z.number().positive('Claimed amount must be greater than 0'),
  approvedAmount: z.number().min(0).optional().default(0),
  rejectionCategory: z.enum([
    REJECTION_CATEGORIES.WAITING_PERIOD,
    REJECTION_CATEGORIES.EXCLUSION,
    REJECTION_CATEGORIES.MISSING_DOCUMENTS,
    REJECTION_CATEGORIES.POLICY_LIMIT,
    REJECTION_CATEGORIES.COPAYMENT,
    REJECTION_CATEGORIES.DEDUCTIBLE,
    REJECTION_CATEGORIES.NON_COVERED_EXPENSE,
    REJECTION_CATEGORIES.INCOMPLETE_INFORMATION,
    REJECTION_CATEGORIES.ROOM_RENT_CAPPING,
    REJECTION_CATEGORIES.OTHER
  ]),
  insurerRemarks: z.string().max(1000).optional()
});

export const findInsuranceSchema = z.object({
  age: z.number().min(18).max(100),
  city: z.string().optional(),
  familyMembersCount: z.number().min(1).max(10).optional().default(1),
  policyType: z.enum(['INDIVIDUAL', 'FAMILY_FLOATER']).optional().default('INDIVIDUAL'),
  requiredSumInsured: z.number().positive('Required sum insured must be greater than 0'),
  budget: z.number().positive().optional(),
  preferences: z.object({
    noRoomRentCapping: z.boolean().optional(),
    zeroCopay: z.boolean().optional(),
    lowWaitingPeriod: z.boolean().optional(),
    restorationBenefit: z.boolean().optional()
  }).optional()
});

export const createReviewSchema = z.object({
  insurerName: z.string().min(2, 'Insurer name is required'),
  policyName: z.string().optional(),
  category: z.enum([
    REVIEW_CATEGORIES.CASHLESS_EXPERIENCE,
    REVIEW_CATEGORIES.REIMBURSEMENT_EXPERIENCE,
    REVIEW_CATEGORIES.CLAIM_PROCESSING_TIME,
    REVIEW_CATEGORIES.CUSTOMER_SUPPORT,
    REVIEW_CATEGORIES.HOSPITAL_EXPERIENCE,
    REVIEW_CATEGORIES.COMMUNICATION,
    REVIEW_CATEGORIES.OVERALL_EXPERIENCE
  ]),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().min(20, 'Review must be at least 20 characters long').max(2000),
  experienceDate: z.string().or(z.date()).transform((val) => new Date(val)),
  claimId: z.string().optional()
});

export const reviewQuerySchema = z.object({
  insurerName: z.string().optional(),
  category: z.string().optional(),
  rating: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20))
});

export const moderateReviewSchema = z.object({
  moderationStatus: z.enum([
    MODERATION_STATUSES.APPROVED,
    MODERATION_STATUSES.PENDING,
    MODERATION_STATUSES.REJECTED
  ])
});

export const createShareLinkSchema = z.object({
  resourceType: z.enum([
    SHAREABLE_RESOURCE_TYPES.POLICY,
    SHAREABLE_RESOURCE_TYPES.CLAIM,
    SHAREABLE_RESOURCE_TYPES.BILL_AUDIT
  ]),
  resourceId: z.string().min(1, 'Resource ID is required'),
  expiresInHours: z.number().min(1).max(720).optional().default(72)
});

export type BillAuditDto = z.infer<typeof billAuditSchema>;
export type RecordRejectionDto = z.infer<typeof recordRejectionSchema>;
export type FindInsuranceDto = z.infer<typeof findInsuranceSchema>;
export type CreateReviewDto = z.infer<typeof createReviewSchema>;
export type CreateShareLinkDto = z.infer<typeof createShareLinkSchema>;

