import request from 'supertest';
import app from '../../src/app';
import { Claim } from '../../src/models/claim.model';
import { Policy } from '../../src/models/policy.model';
import { Hospital } from '../../src/models/hospital.model';
import { generateToken } from '../../src/utils/auth';
import { Types } from 'mongoose';

describe('Claims & Hospitals API Integration Tests', () => {
  const userId = '65f1a2b3c4d5e6f7a8b9c0d1';
  const token = generateToken({
    id: userId,
    email: 'user@hospitality.org',
    role: 'user',
    name: 'Hospitality Patient'
  });

  const mockPolicy = {
    _id: new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d2'),
    userId: new Types.ObjectId(userId),
    insurerName: 'Star Health',
    policyName: 'Family Health Optima',
    policyNumber: 'STAR-FHO-9912',
    sumInsured: 500000
  };

  const mockHospital = {
    _id: new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d3'),
    hospitalName: 'Apollo Hospital Bannerghatta',
    city: 'Bengaluru',
    pincode: '560076',
    insurerRelationships: [
      { insurerName: 'Star Health', networkStatus: 'IN_NETWORK', cashlessAvailable: true }
    ],
    toJSON: function () {
      return { ...this, id: this._id.toString() };
    }
  };

  const mockClaim = {
    _id: new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d4'),
    claimNumber: 'CLM-2026-AB1234',
    userId: new Types.ObjectId(userId),
    policyId: mockPolicy._id,
    currentStage: 'POLICY_CONFIRMED',
    statusSource: 'USER_REPORTED',
    claimedAmount: 75000,
    stageHistory: [
      {
        stage: 'POLICY_CONFIRMED',
        timestamp: new Date(),
        updatedBy: new Types.ObjectId(userId),
        source: 'USER_REPORTED'
      }
    ],
    toJSON: function () {
      return { ...this, id: this._id.toString() };
    },
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/hospitals', () => {
    it('returns hospital list with network affiliations', async () => {
      jest.spyOn(Hospital, 'countDocuments').mockResolvedValue(1);
      jest.spyOn(Hospital, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockHospital])
      } as any);

      const res = await request(app)
        .get('/api/v1/hospitals?city=Bengaluru')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hospitals.length).toBeGreaterThan(0);
      expect(res.body.data.hospitals[0].hospitalName).toContain('Apollo');
    });
  });

  describe('POST /api/v1/claims', () => {
    it('creates a new claim in POLICY_CONFIRMED stage', async () => {
      jest.spyOn(Policy, 'findOne').mockResolvedValue(mockPolicy as any);
      jest.spyOn(Claim, 'create').mockResolvedValue(mockClaim as any);

      const res = await request(app)
        .post('/api/v1/claims')
        .set('Authorization', `Bearer ${token}`)
        .send({
          policyId: mockPolicy._id.toString(),
          claimType: 'CASHLESS',
          claimedAmount: 75000,
          diseaseOrDiagnosis: 'Appendicitis'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStage).toBe('POLICY_CONFIRMED');
    });
  });

  describe('PATCH /api/v1/claims/:id/status', () => {
    it('allows valid stage transition from POLICY_CONFIRMED to HOSPITAL_SELECTED', async () => {
      jest.spyOn(Claim, 'findOne').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve(mockClaim)
      } as any);

      const res = await request(app)
        .patch(`/api/v1/claims/${mockClaim._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          newStage: 'HOSPITAL_SELECTED',
          remarks: 'Selected Apollo Bannerghatta for admission'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockClaim.save).toHaveBeenCalled();
    });

    it('rejects illegal stage jump from POLICY_CONFIRMED to CLAIM_SETTLED with 400', async () => {
      const unadvancedClaim = {
        ...mockClaim,
        currentStage: 'POLICY_CONFIRMED',
        stageHistory: [...mockClaim.stageHistory]
      };
      jest.spyOn(Claim, 'findOne').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve(unadvancedClaim)
      } as any);

      const res = await request(app)
        .patch(`/api/v1/claims/${mockClaim._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          newStage: 'CLAIM_SETTLED'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STAGE_TRANSITION');
    });
  });
});

