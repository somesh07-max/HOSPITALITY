import { createPolicySchema, confirmPolicySchema } from '../../src/validators/policy.validator';
import { storageService } from '../../src/services/storage.service';
import fs from 'fs';
import path from 'path';

describe('Policy & Document Unit Tests', () => {
  describe('Policy Validation Schema', () => {
    it('accepts valid policy payload', () => {
      const valid = {
        insurerName: 'HDFC ERGO',
        policyName: 'Optima Secure',
        policyNumber: 'HDFC-OPT-2026-99',
        policyType: 'INDIVIDUAL',
        sumInsured: 500000,
        inceptionDate: '2024-01-01',
        expiryDate: '2027-01-01',
        roomRentLimit: { limitType: 'NO_LIMIT' },
        waitingPeriods: {
          initialWaitingPeriodDays: 30,
          specificDiseaseMonths: 24,
          preExistingDiseaseMonths: 36
        }
      };

      const parsed = createPolicySchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects policy with missing required fields or negative sum insured', () => {
      const invalid = {
        insurerName: 'HDFC ERGO',
        sumInsured: -500
      };

      const parsed = createPolicySchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('validates confirmation payload', () => {
      const confirmPayload = {
        fieldConfirmations: [
          {
            fieldName: 'roomRentLimit',
            status: 'CONFIRMED',
            notes: 'Verified against schedule'
          }
        ],
        markAllConfirmed: false
      };

      const parsed = confirmPolicySchema.safeParse(confirmPayload);
      expect(parsed.success).toBe(true);
    });
  });

  describe('Storage Service Abstraction', () => {
    const testFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'policy_schedule.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('%PDF-1.4 test dummy content'),
      destination: '',
      filename: '',
      path: '',
      stream: null as any
    };

    it('saves a PDF file securely and returns metadata', async () => {
      const result = await storageService.saveFile(testFile, 'test_unit');
      expect(result).toHaveProperty('storedFilename');
      expect(result).toHaveProperty('filePath');
      expect(result.fileSize).toBe(1024);

      const exists = await storageService.fileExists(result.filePath);
      expect(exists).toBe(true);

      // Clean up
      await storageService.deleteFile(result.filePath);
      const afterDelete = await storageService.fileExists(result.filePath);
      expect(afterDelete).toBe(false);
    });

    it('blocks directory traversal attempts in getFilePath', () => {
      expect(() => {
        storageService.getFilePath('../../windows/system32/cmd.exe');
      }).toThrow('directory traversal');
    });
  });
});

