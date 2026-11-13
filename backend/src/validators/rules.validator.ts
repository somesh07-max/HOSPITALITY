import { z } from 'zod';

export const waitingPeriodCheckSchema = z.object({
  inceptionDate: z.string().or(z.date()).transform((val) => new Date(val)),
  treatmentDate: z.string().or(z.date()).transform((val) => new Date(val)),
  renewalDate: z.string().or(z.date()).optional().transform((val) => (val ? new Date(val) : undefined)),
  diseaseType: z.enum(['ACCIDENT', 'INITIAL_ILLNESS', 'SPECIFIC_DISEASE', 'PRE_EXISTING']).default('INITIAL_ILLNESS'),
  diseaseName: z.string().optional(),
  isPreExisting: z.boolean().optional().default(false),
  initialWaitingDays: z.number().min(0).optional().default(30),
  specificDiseaseMonths: z.number().min(0).optional().default(24),
  pedWaitingMonths: z.number().min(0).optional().default(36)
});

const billItemSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  category: z.enum([
    'ROOM_RENT',
    'ICU_CHARGES',
    'NURSING',
    'DOCTOR_FEE',
    'SURGEON_OT_FEE',
    'INVESTIGATION_DIAGNOSTICS',
    'PHARMACY_MEDICINE',
    'IMPLANTS',
    'CONSUMABLES',
    'OTHER'
  ]),
  billedAmount: z.number().min(0, 'Billed amount must be non-negative'),
  isProportionateEligible: z.boolean().optional()
});

export const proportionateDeductionSchema = z.object({
  ruleId: z.string().optional(),
  roomRentLimit: z.number().min(0, 'Room rent limit must be non-negative'),
  actualRoomRent: z.number().min(0, 'Actual room rent must be non-negative'),
  roomDays: z.number().min(1).optional().default(1),
  roomCategoryOccupied: z.string().optional(),
  eligibleRoomCategory: z.string().optional(),
  billItems: z.array(billItemSchema).min(1, 'At least one bill item is required')
});

export const roomUpgradeSchema = z.object({
  policyRoomRentLimit: z.number().min(0),
  currentRoomCategory: z.string().min(1),
  currentRoomDailyRate: z.number().min(0),
  targetRoomCategory: z.string().min(1),
  targetRoomDailyRate: z.number().min(0),
  stayDays: z.number().min(1),
  estimatedAssociatedExpenses: z.number().min(0),
  estimatedProtectedExpenses: z.number().min(0).optional().default(0)
});

export const evaluateCoverageSchema = z.object({
  policyId: z.string().optional(),
  sumInsured: z.number().positive().optional(),
  availableSumInsured: z.number().min(0).optional(),
  inceptionDate: z.string().or(z.date()).optional().transform((val) => (val ? new Date(val) : undefined)),
  treatmentDate: z.string().or(z.date()).transform((val) => new Date(val)),
  diseaseName: z.string().min(1, 'Disease or condition name is required'),
  isPreExisting: z.boolean().optional().default(false),
  isAccidental: z.boolean().optional().default(false),
  claimedAmount: z.number().positive('Claimed amount must be greater than 0'),
  roomRentDaily: z.number().min(0).optional(),
  roomRentLimitDaily: z.number().min(0).optional(),
  daysInHospital: z.number().min(1).optional().default(1),
  copayPercentage: z.number().min(0).max(100).optional(),
  deductibleAmount: z.number().min(0).optional(),
  policyExclusions: z.array(z.string()).optional(),
  subLimits: z.array(z.object({ category: z.string(), limitAmount: z.number() })).optional(),
  billItems: z.array(billItemSchema).optional()
});

export type WaitingPeriodCheckDto = z.infer<typeof waitingPeriodCheckSchema>;
export type ProportionateDeductionDto = z.infer<typeof proportionateDeductionSchema>;
export type RoomUpgradeDto = z.infer<typeof roomUpgradeSchema>;
export type EvaluateCoverageDto = z.infer<typeof evaluateCoverageSchema>;

