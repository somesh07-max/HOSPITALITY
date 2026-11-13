import request from 'supertest';
import app from '../../src/app';
import { Policy } from '../../src/models/policy.model';
import { PolicyDocument } from '../../src/models/document.model';
import { generateToken } from '../../src/utils/auth';
import { storageService } from '../../src/services/storage.service';
import { Types } from 'mongoose';

describe('Policy & Document Integration Tests', () => {
  const userId = '65f1a2b3c4d5e6f7a8b9c0d1';
  const otherUserId = '65f1a2b3c4d5e6f7a8b9c0d9';
  const token = generateToken({
    id: userId,
    email: 'user@hospitality.org',
    role: 'user',
    name: 'Hospitality User'
  });

  const mockPolicy = {
    _id: new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d2'),
    userId: new Types.ObjectId(userId),
    insurerName: 'Care Health Insurance',
    policyName: 'Care Supreme',
    policyNumber: 'CARE-SUP-100234',
    policyType: 'INDIVIDUAL',
    sumInsured: 1000000,
    inceptionDate: new Date('2023-01-01'),
    expiryDate: new Date('2026-01-01'),
    confirmationStatus: 'UNCONFIRMED',
    fieldConfirmations: [],
    verificationStatus: 'MANUALLY_ENTERED',
    toJSON: function () {
      return { ...this, id: this._id.toString() };
    },
    save: jest.fn().mockResolvedValue(true),
    deleteOne: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/policies', () => {
    it('creates a new policy for authenticated user', async () => {
      jest.spyOn(Policy, 'findOne').mockResolvedValue(null as any);
      jest.spyOn(Policy, 'create').mockResolvedValue(mockPolicy as any);

      const res = await request(app)
        .post('/api/v1/policies')
        .set('Authorization', `Bearer ${token}`)
        .send({
          insurerName: 'Care Health Insurance',
          policyName: 'Care Supreme',
          policyNumber: 'CARE-SUP-100234',
          policyType: 'INDIVIDUAL',
          sumInsured: 1000000,
          inceptionDate: '2023-01-01',
          expiryDate: '2026-01-01'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.policyNumber).toBe('CARE-SUP-100234');
    });

    it('rejects duplicate policyNumber for same user with 409', async () => {
      jest.spyOn(Policy, 'findOne').mockResolvedValue(mockPolicy as any);

      const res = await request(app)
        .post('/api/v1/policies')
        .set('Authorization', `Bearer ${token}`)
        .send({
          insurerName: 'Care Health Insurance',
          policyName: 'Care Supreme',
          policyNumber: 'CARE-SUP-100234',
          policyType: 'INDIVIDUAL',
          sumInsured: 1000000,
          inceptionDate: '2023-01-01',
          expiryDate: '2026-01-01'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_POLICY');
    });
  });

  describe('GET /api/v1/policies/:id', () => {
    it('returns policy when user is the owner', async () => {
      jest.spyOn(Policy, 'findOne').mockResolvedValue(mockPolicy as any);

      const res = await request(app)
        .get(`/api/v1/policies/${mockPolicy._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.policyName).toBe('Care Supreme');
    });

    it('returns 404 when policy does not belong to user', async () => {
      jest.spyOn(Policy, 'findOne').mockResolvedValue(null as any);

      const res = await request(app)
        .get(`/api/v1/policies/${mockPolicy._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('POLICY_NOT_FOUND');
    });
  });

  describe('POST /api/v1/policies/:id/confirm', () => {
    it('updates confirmation status and field details', async () => {
      jest.spyOn(Policy, 'findOne').mockResolvedValue(mockPolicy as any);

      const res = await request(app)
        .post(`/api/v1/policies/${mockPolicy._id}/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          fieldConfirmations: [
            { fieldName: 'sumInsured', status: 'CONFIRMED', notes: 'Verified' }
          ],
          markAllConfirmed: true
        });

      expect(res.status).toBe(200);
      expect(mockPolicy.save).toHaveBeenCalled();
    });
  });

  describe('Document Upload Validation', () => {
    it('rejects non-PDF uploads with 400 UNSUPPORTED_FILE_TYPE', async () => {
      const res = await request(app)
        .post(`/api/v1/policies/${mockPolicy._id}/documents`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('console.log("not a pdf")'), 'malicious.js');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    });

    it('accepts valid PDF document and creates metadata', async () => {
      jest.spyOn(Policy, 'findOne').mockResolvedValue(mockPolicy as any);
      jest.spyOn(storageService, 'saveFile').mockResolvedValue({
        storedFilename: '1234_policy.pdf',
        filePath: 'policies/1234_policy.pdf',
        fileSize: 500
      });
      jest.spyOn(PolicyDocument, 'create').mockResolvedValue({
        _id: 'doc_123',
        originalFilename: 'policy.pdf',
        fileSize: 500,
        mimeType: 'application/pdf',
        toJSON: () => ({ id: 'doc_123', originalFilename: 'policy.pdf' })
      } as any);

      const res = await request(app)
        .post(`/api/v1/policies/${mockPolicy._id}/documents`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('%PDF-1.4 sample pdf content'), 'policy.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });
});

