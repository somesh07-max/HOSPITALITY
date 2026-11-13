import { waitingPeriodService } from '../../src/services/rules/waitingPeriod.service';
import { proportionateDeductionService } from '../../src/services/rules/proportionateDeduction.service';
import { roomUpgradeService } from '../../src/services/rules/roomUpgrade.service';
import { coverageEvaluationService } from '../../src/services/rules/coverageEvaluation.service';

describe('Deterministic Insurance Rules Engine Tests', () => {
  describe('Waiting Period Service', () => {
    const inceptionDate = '2024-01-01T00:00:00.000Z';

    it('waives waiting period for accidental injuries from day 1', () => {
      const treatmentDate = '2024-01-05T00:00:00.000Z';
      const result = waitingPeriodService.checkEligibility({
        inceptionDate,
        treatmentDate,
        diseaseType: 'ACCIDENT',
        diseaseName: 'Fracture from road accident'
      });

      expect(result.isCovered).toBe(true);
      expect(result.decisionTrace.ruleId).toBe('RULE_ACCIDENT_WAITING_PERIOD_WAIVER');
      expect(result.decisionTrace.verificationStatus).toBe('VERIFIED_OFFICIAL');
    });

    it('rejects illnesses occurring within the initial 30 days and approves after day 30', () => {
      // Day 15 illness -> Rejected
      const earlyIllness = waitingPeriodService.checkEligibility({
        inceptionDate,
        treatmentDate: '2024-01-16T00:00:00.000Z',
        diseaseType: 'INITIAL_ILLNESS',
        diseaseName: 'Acute Gastroenteritis'
      });
      expect(earlyIllness.isCovered).toBe(false);
      expect(earlyIllness.daysRemaining).toBeGreaterThan(0);
      expect(earlyIllness.decisionTrace.ruleId).toBe('RULE_WAITING_PERIOD_INITIAL_30_DAYS');

      // Day 45 illness -> Approved
      const lateIllness = waitingPeriodService.checkEligibility({
        inceptionDate,
        treatmentDate: '2024-02-15T00:00:00.000Z',
        diseaseType: 'INITIAL_ILLNESS',
        diseaseName: 'Acute Bronchitis'
      });
      expect(lateIllness.isCovered).toBe(true);
      expect(lateIllness.daysRemaining).toBe(0);
    });

    it('evaluates pre-existing disease (PED) 36-month waiting period accurately', () => {
      // Month 12 -> Rejected with daysRemaining
      const earlyPed = waitingPeriodService.checkEligibility({
        inceptionDate,
        treatmentDate: '2025-01-01T00:00:00.000Z', // 12 months later
        diseaseType: 'PRE_EXISTING',
        diseaseName: 'Hypertension and cardiac event',
        isPreExisting: true,
        pedWaitingMonths: 36
      });
      expect(earlyPed.isCovered).toBe(false);
      expect(earlyPed.decisionTrace.ruleId).toBe('RULE_WAITING_PERIOD_PED');
      expect(earlyPed.decisionTrace.clauseReference).toContain('Clause 4.3');

      // Month 38 -> Approved
      const maturePed = waitingPeriodService.checkEligibility({
        inceptionDate,
        treatmentDate: '2027-03-01T00:00:00.000Z', // 38 months later
        diseaseType: 'PRE_EXISTING',
        diseaseName: 'Hypertension',
        isPreExisting: true,
        pedWaitingMonths: 36
      });
      expect(maturePed.isCovered).toBe(true);
      expect(maturePed.daysRemaining).toBe(0);
    });

    it('evaluates specific 2-year disease waiting period', () => {
      // Month 10 -> Rejected
      const earlyHernia = waitingPeriodService.checkEligibility({
        inceptionDate,
        treatmentDate: '2024-11-01T00:00:00.000Z',
        diseaseType: 'SPECIFIC_DISEASE',
        diseaseName: 'Inguinal Hernia Repair',
        specificDiseaseMonths: 24
      });
      expect(earlyHernia.isCovered).toBe(false);

      // Month 25 -> Approved
      const eligibleHernia = waitingPeriodService.checkEligibility({
        inceptionDate,
        treatmentDate: '2026-02-01T00:00:00.000Z',
        diseaseType: 'SPECIFIC_DISEASE',
        diseaseName: 'Inguinal Hernia Repair',
        specificDiseaseMonths: 24
      });
      expect(eligibleHernia.isCovered).toBe(true);
    });
  });

  describe('Proportionate Deduction Simulator', () => {
    it('applies no proportionate deduction when room rent is within policy limit', () => {
      const result = proportionateDeductionService.calculate({
        roomRentLimit: 6000,
        actualRoomRent: 5000,
        roomDays: 2,
        billItems: [
          { description: 'Room Rent', category: 'ROOM_RENT', billedAmount: 10000 },
          { description: 'Doctor Fees', category: 'DOCTOR_FEE', billedAmount: 15000 },
          { description: 'Pharmacy', category: 'PHARMACY_MEDICINE', billedAmount: 8000 }
        ]
      });

      expect(result.isRoomRentExceeded).toBe(false);
      expect(result.proportionateRatio).toBe(1.0);
      expect(result.totalProportionateDeduction).toBe(0);
      expect(result.totalAllowedAmount).toBe(33000);
    });

    it('calculates proportionate reduction on doctor/OT fees while protecting medicines under IRDAI 2020 circular', () => {
      // Room rent limit 5000, Actual room rent 10000 -> Ratio 0.5 (50%)
      const result = proportionateDeductionService.calculate({
        roomRentLimit: 5000,
        actualRoomRent: 10000,
        roomDays: 2,
        billItems: [
          { description: 'Deluxe Room Bed', category: 'ROOM_RENT', billedAmount: 20000 }, // Capped to 5000*2 = 10000
          { description: 'Surgeon Fee', category: 'DOCTOR_FEE', billedAmount: 40000 }, // 40000 * 0.5 = 20000
          { description: 'OT Charges', category: 'SURGEON_OT_FEE', billedAmount: 30000 }, // 30000 * 0.5 = 15000
          { description: 'Critical Care Injections', category: 'PHARMACY_MEDICINE', billedAmount: 25000 } // Protected 100%
        ]
      });

      expect(result.isRoomRentExceeded).toBe(true);
      expect(result.proportionateRatio).toBe(0.5);
      expect(result.clauseReference).toContain('IRDAI/HLT/REG/CIR/193/09/2020 Clause 5.2');

      const roomItem = result.items.find((i) => i.category === 'ROOM_RENT')!;
      expect(roomItem.allowedAmount).toBe(10000);
      expect(roomItem.deductedAmount).toBe(10000);

      const surgeonItem = result.items.find((i) => i.category === 'DOCTOR_FEE')!;
      expect(surgeonItem.allowedAmount).toBe(20000);
      expect(surgeonItem.deductedAmount).toBe(20000);

      const otItem = result.items.find((i) => i.category === 'SURGEON_OT_FEE')!;
      expect(otItem.allowedAmount).toBe(15000);
      expect(otItem.deductedAmount).toBe(15000);

      const pharmacyItem = result.items.find((i) => i.category === 'PHARMACY_MEDICINE')!;
      expect(pharmacyItem.allowedAmount).toBe(25000);
      expect(pharmacyItem.deductedAmount).toBe(0);
      expect(pharmacyItem.clauseNote).toContain('Protected');

      // Total billed: 20k + 40k + 30k + 25k = 115k
      // Total allowed: 10k + 20k + 15k + 25k = 70k
      // Disallowed deduction: 45k
      expect(result.totalBilledAmount).toBe(115000);
      expect(result.totalAllowedAmount).toBe(70000);
      expect(result.totalProportionateDeduction).toBe(45000);
      expect(result.decisionTrace.ruleId).toBe('RULE_IRDAI_CIR_2020_OFFICIAL');
    });
  });

  describe('Room Upgrade Simulator', () => {
    it('accurately computes direct differential and cascaded proportionate impact', () => {
      const upgrade = roomUpgradeService.simulate({
        policyRoomRentLimit: 5000,
        currentRoomCategory: 'Standard Single Room',
        currentRoomDailyRate: 5000,
        targetRoomCategory: 'Suite Deluxe',
        targetRoomDailyRate: 10000,
        stayDays: 4,
        estimatedAssociatedExpenses: 120000,
        estimatedProtectedExpenses: 30000
      });

      // Direct room diff: (10000 - 5000) * 4 = 20,000
      expect(upgrade.directRoomRentDifferential).toBe(20000);

      // Proportionate ratio: 5000 / 10000 = 0.5
      expect(upgrade.proportionateScalingFactor).toBe(0.5);

      // Cascaded deduction on 120,000 = 120,000 * (1 - 0.5) = 60,000
      expect(upgrade.cascadedProportionateDeduction).toBe(60000);

      // Total patient out-of-pocket: 20,000 + 60,000 = 80,000
      expect(upgrade.totalAdditionalOutOfPocketCost).toBe(80000);
      expect(upgrade.explanation).toContain('Suite Deluxe');
      expect(upgrade.decisionTrace.inputs.policyRoomRentLimit).toBe(5000);
    });
  });

  describe('Master Coverage Evaluation Engine', () => {
    const basePolicy = {
      sumInsured: 500000,
      inceptionDate: '2023-01-01',
      treatmentDate: '2026-05-01',
      roomRentLimitDaily: 5000
    };

    it('rejects claim for permanently excluded ailments', () => {
      const result = coverageEvaluationService.evaluate({
        ...basePolicy,
        diseaseName: 'Cosmetic Rhinoplasty Surgery',
        claimedAmount: 75000,
        policyExclusions: ['Cosmetic', 'Maternity', 'Dental']
      });

      expect(result.isCovered).toBe(false);
      expect(result.summary.estimatedPayableAmount).toBe(0);
      expect(result.summary.rejectionReason).toContain('permanent exclusions');
    });

    it('applies sub-limit, deductible, and co-payment deterministically in sequence', () => {
      // Cataract claim with sub-limit 40,000, deductible 5,000, copay 10%
      const result = coverageEvaluationService.evaluate({
        ...basePolicy,
        diseaseName: 'Cataract Surgery Left Eye',
        claimedAmount: 65000,
        subLimits: [{ category: 'Cataract', limitAmount: 40000 }],
        deductibleAmount: 5000,
        copayPercentage: 10
      });

      expect(result.isCovered).toBe(true);
      expect(result.subLimitAssessment.hasSublimit).toBe(true);
      // Claim 65,000 capped at 40,000 sub-limit
      // Then Deductible of 5,000 applied: 40,000 - 5,000 = 35,000
      // Then Copay of 10% on 35,000 = 3,500
      // Net payable = 35,000 - 3,500 = 31,500
      expect(result.summary.deductibleApplied).toBe(5000);
      expect(result.summary.copaymentApplied).toBe(3500);
      expect(result.summary.estimatedPayableAmount).toBe(31500);
      expect(result.summary.remainingSumInsured).toBe(500000 - 31500);
    });
  });
});

