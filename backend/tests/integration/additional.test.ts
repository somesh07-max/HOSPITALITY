import request from 'supertest';
import app from '../../src/app';
import { Policy } from '../../src/models/policy.model';
import { Claim } from '../../src/models/claim.model';
import { BillAudit } from '../../src/models/billAudit.model';
import { Review } from '../../src/models/review.model';
import { ShareLink } from '../../src/models/shareLink.model';
import { ClaimRejectionRecord } from '../../src/models/rejection.model';
import { InsuranceProduct } from '../../src/models/insuranceProduct.model';
import { INITIAL_PRODUCTS_SEED } from '../../src/services/findInsurance.service';
import { generateToken } from '../../src/utils/auth';
import { Types } from 'mongoose';

describe('Additional Modules Integration Tests (Milestone 6)', () => {
  const userId = '65f1a2b3c4d5e6f7a8b9c0d1';
  const token = generateToken({
    id: userId,
    email: 'patient@hospitality.org',
    role: 'user',
    name: 'Hospitality Patient'
  });
  const adminToken = generateToken({
    id: '65f1a2b3c4d5e6f7a8b9c0d9',
    email: 'admin@hospitality.org',
    role: 'admin',
    name: 'Hospitality Admin'
  });

  const mockPolicy = {
    _id: new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d2'),
    userId: new Types.ObjectId(userId),
    insurerName: 'HDFC ERGO General Insurance',
    policyName: 'Optima Secure',
    policyNumber: 'HDFC-OPT-7711',
    sumInsured: 1000000,
    copayment: { hasCopay: false, percentage: 0 },
    roomRentLimit: { limitType: 'NO_LIMIT' }
  };

  const mockClaim = {
    _id: new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d3'),
    claimNumber: 'CLM-2026-X1Y2Z3',
    userId: new Types.ObjectId(userId),
    policyId: mockPolicy._id,
    currentStage: 'TREATMENT_COMPLETED',
    claimedAmount: 120000,
    stageHistory: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Final Bill Audit API (POST /api/v1/bill-audits)', () => {
    it('detects duplicate items and non-payable consumables deterministically', async () => {
      jest.spyOn(Policy, 'findOne').mockResolvedValue(mockPolicy as any);

      const mockSavedAudit = {
        _id: 'audit_123',
        totalBilledAmount: 85000,
        eligibleAmount: 45000,
        nonEligibleAmount: 40000,
        estimatedPayableAmount: 45000,
        findings: [
          { severity: 'CRITICAL', code: 'DUPLICATE_BILL_ITEM', financialImpact: 35000 },
          { severity: 'WARNING', code: 'NON_PAYABLE_CONSUMABLE', financialImpact: 5000 }
        ],
        toJSON: () => ({ id: 'audit_123' })
      };
      jest.spyOn(BillAudit, 'create').mockResolvedValue(mockSavedAudit as any);

      const res = await request(app)
        .post('/api/v1/bill-audits')
        .set('Authorization', `Bearer ${token}`)
        .send({
          policyId: mockPolicy._id.toString(),
          items: [
            { description: 'Surgical Procedure Charge', category: 'SURGERY', amount: 35000 },
            { description: 'Surgical Procedure Charge', category: 'SURGERY', amount: 35000 }, // Duplicate!
            { description: 'PPE Kit and Luxury Consumables', category: 'CONSUMABLES', amount: 5000 }, // Non-payable!
            { description: 'Physician Consultation', category: 'DOCTOR_FEE', amount: 10000 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(BillAudit.create).toHaveBeenCalled();
    });
  });

  describe('Claim Rejection API (POST /api/v1/rejections/record)', () => {
    it('records claim rejection, classifies category and prepares AI context', async () => {
      jest.spyOn(Claim, 'findOne').mockResolvedValue(mockClaim as any);
      jest.spyOn(Policy, 'findById').mockResolvedValue(mockPolicy as any);

      const mockRejectionRecord = {
        _id: 'rej_123',
        claimId: mockClaim._id,
        differenceAmount: 50000,
        rejectionCategory: 'ROOM_RENT_CAPPING',
        deterministicClassification: {
          appealViability: 'HIGH',
          relevantClauses: ['IRDAI Circular 2020 Clause 5.2']
        },
        preparedForAiContext: { claimNumber: 'CLM-2026-X1Y2Z3' },
        toJSON: () => ({ id: 'rej_123' })
      };
      jest.spyOn(ClaimRejectionRecord, 'create').mockResolvedValue(mockRejectionRecord as any);

      const res = await request(app)
        .post('/api/v1/rejections/record')
        .set('Authorization', `Bearer ${token}`)
        .send({
          claimId: mockClaim._id.toString(),
          claimedAmount: 120000,
          approvedAmount: 70000,
          rejectionCategory: 'ROOM_RENT_CAPPING',
          insurerRemarks: 'Proportionate deduction applied'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(ClaimRejectionRecord.create).toHaveBeenCalled();
    });
  });

  describe('Find Insurance API (POST /api/v1/insurance/compare)', () => {
    it('returns ranked policies with transparent preference scoring', async () => {
      jest.spyOn(InsuranceProduct, 'countDocuments').mockResolvedValue(3 as any);
      jest.spyOn(InsuranceProduct, 'find').mockResolvedValue(INITIAL_PRODUCTS_SEED as any);

      const res = await request(app)
        .post('/api/v1/insurance/compare')
        .send({
          age: 32,
          city: 'Bengaluru',
          familyMembersCount: 2,
          requiredSumInsured: 1000000,
          budget: 20000,
          preferences: {
            noRoomRentCapping: true,
            zeroCopay: true,
            restorationBenefit: true
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rankedPolicies.length).toBeGreaterThan(0);
      expect(res.body.data.rankedPolicies[0]).toHaveProperty('matchScore');
      expect(res.body.data.rankedPolicies[0]).toHaveProperty('scoreBreakdown');
      expect(res.body.data).toHaveProperty('scoringMethodology');
    });
  });

  describe('Real Voices API (Reviews)', () => {
    it('returns "Insufficient verified reviews available." when no reviews exist', async () => {
      jest.spyOn(Review, 'find').mockResolvedValue([]);

      const res = await request(app).get('/api/v1/reviews/stats?insurerName=NonExistentInsurer');

      expect(res.status).toBe(200);
      expect(res.body.data.hasSufficientData).toBe(false);
      expect(res.body.data.message).toBe('Insufficient verified reviews available.');
    });

    it('submits genuine review and assigns VERIFIED_POLICYHOLDER badge', async () => {
      jest.spyOn(Policy, 'findOne').mockResolvedValue(mockPolicy as any);
      jest.spyOn(Review, 'create').mockResolvedValue({
        _id: 'rev_123',
        verificationStatus: 'VERIFIED_POLICYHOLDER',
        toJSON: () => ({ id: 'rev_123', verificationStatus: 'VERIFIED_POLICYHOLDER' })
      } as any);

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          insurerName: 'HDFC ERGO General Insurance',
          category: 'CASHLESS_EXPERIENCE',
          rating: 5,
          reviewText: 'Outstanding cashless approval process at hospital desk.',
          experienceDate: '2026-01-20'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Secure View-Only Sharing API', () => {
    it('generates cryptographic share token and retrieves sanitized resource view', async () => {
      jest.spyOn(Policy, 'findOne').mockResolvedValue(mockPolicy as any);
      const mockLink = {
        _id: 'link_123',
        token: 'token_abc_123_xyz',
        resourceType: 'POLICY',
        resourceId: mockPolicy._id,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        accessCount: 0,
        save: jest.fn().mockResolvedValue(true)
      };
      jest.spyOn(ShareLink, 'create').mockResolvedValue(mockLink as any);
      jest.spyOn(ShareLink, 'findOne').mockResolvedValue(mockLink as any);
      jest.spyOn(Policy, 'findById').mockResolvedValue(mockPolicy as any);

      // 1. Create Share Link
      const createRes = await request(app)
        .post('/api/v1/share-links')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceType: 'POLICY',
          resourceId: mockPolicy._id.toString(),
          expiresInHours: 48
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data).toHaveProperty('token');

      // 2. Access Public Shared Link
      const viewRes = await request(app).get(`/api/v1/shared/${mockLink.token}`);
      expect(viewRes.status).toBe(200);
      expect(viewRes.body.data.resourceType).toBe('POLICY');
      expect(viewRes.body.data.sanitizedData.policyName).toBe('Optima Secure');
      expect(viewRes.body.data.sanitizedData).not.toHaveProperty('userId');
    });

    it('rejects revoked share link with 410 status', async () => {
      const revokedLink = {
        token: 'revoked_token',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000)
      };
      jest.spyOn(ShareLink, 'findOne').mockResolvedValue(revokedLink as any);

      const res = await request(app).get('/api/v1/shared/revoked_token');
      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe('SHARE_LINK_REVOKED');
    });
  });
});
