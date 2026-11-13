import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { authenticateToken } from '../middleware/auth';

export const documentRouter = Router();

documentRouter.use(authenticateToken);

documentRouter.get('/:id/download', (req, res, next) =>
  documentController.downloadDocument(req, res, next)
);

documentRouter.delete('/:id', (req, res, next) =>
  documentController.deleteDocument(req, res, next)
);

