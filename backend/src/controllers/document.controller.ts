import { Response, NextFunction } from 'express';
import fs from 'fs';
import { AuthenticatedRequest } from '../types';
import { policyService } from '../services/policy.service';
import { storageService } from '../services/storage.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export class DocumentController {
  async uploadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('No document file was provided for upload', 400, 'FILE_MISSING');
      }

      const documentType = (req.body.documentType as any) || 'POLICY_SCHEDULE';
      const doc = await policyService.addDocument(
        req.params.id,
        req.user!.id,
        req.file,
        documentType
      );

      sendSuccess(res, 201, doc, 'Document uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDocumentsByPolicy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const documents = await policyService.getPolicyDocuments(req.params.id, req.user!.id);
      sendSuccess(res, 200, documents);
    } catch (error) {
      next(error);
    }
  }

  async downloadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user!.role === 'admin';
      const doc = await policyService.getDocumentById(req.params.id, req.user!.id, isAdmin);
      const fullPath = storageService.getFilePath(doc.filePath);

      if (!fs.existsSync(fullPath)) {
        throw new AppError('File binary not found on storage server', 404, 'FILE_NOT_FOUND');
      }

      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalFilename)}"`);
      res.setHeader('Content-Length', doc.fileSize);

      const stream = fs.createReadStream(fullPath);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  async deleteDocument(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user!.role === 'admin';
      await policyService.deleteDocument(req.params.id, req.user!.id, isAdmin);
      sendSuccess(res, 200, { deleted: true }, 'Document deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const documentController = new DocumentController();

