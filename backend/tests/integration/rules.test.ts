import request from 'supertest';
import app from '../../src/app';
import { generateToken } from '../../src/utils/auth';

describe('Rules Engine & Waiting Period API Integration Tests', () => {
  const token = generateToken({
    id: '65f1a2b3c4d5e6f7a8b9c0d1',
    email: 'user@hospitality.org',
    role: 'user',
    name: 'Hospitality User'
  });

  describe('POST /api/v1/waiting-periods/check', () => {
    it('returns 200 with deterministic waiting period calculation', async () => {
      const res = await request(app)
        .post('/api/v1/waiting-periods/check')
        .set('Authorization', `Bearer ${token}`)
        .send({
          inceptionDate: '2023-01-01',
          treatmentDate: '2026-06-01',
          diseaseType: 'SPECIFIC_DISEASE',
          diseaseName: 'Cataract',
          specificDiseaseMonths: 24
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isCovered).toBe(true);
      expect(res.body.data).toHaveProperty('decisionTrace');
    });
  });

  describe('POST /api/v1/rules/proportionate-deduction', () => {
    it('returns 200 with itemized audit and IRDAI trace', async () => {
      const res = await request(app)
        .post('/api/v1/rules/proportionate-deduction')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomRentLimit: 5000,
          actualRoomRent: 10000,
          roomDays: 2,
          billItems: [
            { description: 'Room', category: 'ROOM_RENT', billedAmount: 20000 },
            { description: 'Consultant', category: 'DOCTOR_FEE', billedAmount: 20000 },
            { description: 'Medicine', category: 'PHARMACY_MEDICINE', billedAmount: 15000 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.proportionateRatio).toBe(0.5);
      expect(res.body.data.totalProportionateDeduction).toBe(20000); // 10k room + 10k doc
    });
  });

  describe('POST /api/v1/rules/room-upgrade', () => {
    it('returns 200 with what-if financial impact projection', async () => {
      const res = await request(app)
        .post('/api/v1/rules/room-upgrade')
        .set('Authorization', `Bearer ${token}`)
        .send({
          policyRoomRentLimit: 4000,
          currentRoomCategory: 'Twin Sharing',
          currentRoomDailyRate: 4000,
          targetRoomCategory: 'Single Private',
          targetRoomDailyRate: 8000,
          stayDays: 3,
          estimatedAssociatedExpenses: 60000,
          estimatedProtectedExpenses: 20000
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.directRoomRentDifferential).toBe(12000);
      expect(res.body.data.cascadedProportionateDeduction).toBe(30000);
      expect(res.body.data.totalAdditionalOutOfPocketCost).toBe(42000);
    });
  });

  describe('POST /api/v1/rules/evaluate', () => {
    it('evaluates complete coverage deterministically', async () => {
      const res = await request(app)
        .post('/api/v1/rules/evaluate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sumInsured: 500000,
          inceptionDate: '2023-01-01',
          treatmentDate: '2026-01-10',
          diseaseName: 'Kidney Stone Lithotripsy',
          claimedAmount: 90000,
          roomRentDaily: 5000,
          roomRentLimitDaily: 5000,
          copayPercentage: 10
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isCovered).toBe(true);
      expect(res.body.data.summary.estimatedPayableAmount).toBe(81000); // 90,000 - 10%
    });
  });
});

