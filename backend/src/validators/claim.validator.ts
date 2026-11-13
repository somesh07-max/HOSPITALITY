import { z } from 'zod';
import { CLAIM_STAGES, STATUS_SOURCES } from '../constants';

export const createClaimSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  hospitalId: z.string().optional(),
  claimType: z.enum(['CASHLESS', 'REIMBURSEMENT']).default('CASHLESS'),
  claimedAmount: z.number().positive('Claimed amount must be greater than 0'),
  diseaseOrDiagnosis: z.string().optional(),
  admissionDate: z.string().or(z.date()).optional().transform((val) => (val ? new Date(val) : undefined)),
  dischargeDate: z.string().or(z.date()).optional().transform((val) => (val ? new Date(val) : undefined))
});

export const updateClaimStatusSchema = z.object({
  newStage: z.enum([
    CLAIM_STAGES.POLICY_CONFIRMED,
    CLAIM_STAGES.HOSPITAL_SELECTED,
    CLAIM_STAGES.ADMISSION_INITIATED,
    CLAIM_STAGES.PRE_AUTH_SUBMITTED,
    CLAIM_STAGES.PRE_AUTH_PENDING,
    CLAIM_STAGES.PRE_AUTH_APPROVED,
    CLAIM_STAGES.PRE_AUTH_REJECTED,
    CLAIM_STAGES.TREATMENT_COMPLETED,
    CLAIM_STAGES.FINAL_BILL_SUBMITTED,
    CLAIM_STAGES.CLAIM_UNDER_REVIEW,
    CLAIM_STAGES.CLAIM_SETTLED,
    CLAIM_STAGES.CLAIM_CLOSED
  ]),
  remarks: z.string().max(500).optional(),
  statusSource: z.enum([STATUS_SOURCES.USER_REPORTED, STATUS_SOURCES.INSURER_CONFIRMED]).default(STATUS_SOURCES.USER_REPORTED),
  approvedAmount: z.number().min(0).optional(),
  settledAmount: z.number().min(0).optional()
});

export const hospitalQuerySchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  insurerName: z.string().optional(),
  networkStatus: z.enum(['IN_NETWORK', 'OUT_OF_NETWORK', 'EXCLUDED']).optional(),
  cashlessOnly: z.string().optional().transform((val) => val === 'true'),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20))
});

export type CreateClaimDto = z.infer<typeof createClaimSchema>;
export type UpdateClaimStatusDto = z.infer<typeof updateClaimStatusSchema>;
export type HospitalQueryDto = z.infer<typeof hospitalQuerySchema>;

