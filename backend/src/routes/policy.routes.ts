import { Router } from 'express';
import { policyController } from '../controllers/policy.controller';
import { documentController } from '../controllers/document.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { documentUpload } from '../middleware/upload';
import {
  createPolicySchema,
  updatePolicySchema,
  confirmPolicySchema
} from '../validators/policy.validator';

export const policyRouter = Router();

// All policy routes require authentication
policyRouter.use(authenticateToken);

policyRouter.post(
  '/',
  validateRequest({ body: createPolicySchema }),
  (req, res, next) => policyController.createPolicy(req, res, next)
);

policyRouter.get('/', (req, res, next) => policyController.getUserPolicies(req, res, next));

policyRouter.get('/:id', (req, res, next) => policyController.getPolicyById(req, res, next));

policyRouter.put(
  '/:id',
  validateRequest({ body: updatePolicySchema }),
  (req, res, next) => policyController.updatePolicy(req, res, next)
);

policyRouter.delete('/:id', (req, res, next) => policyController.deletePolicy(req, res, next));

policyRouter.post(
  '/:id/confirm',
  validateRequest({ body: confirmPolicySchema }),
  (req, res, next) => policyController.confirmPolicy(req, res, next)
);

// Document upload & listing under policy resource
policyRouter.post(
  '/:id/documents',
  documentUpload.single('file'),
  (req, res, next) => documentController.uploadDocument(req, res, next)
);

policyRouter.get('/:id/documents', (req, res, next) =>
  documentController.getDocumentsByPolicy(req, res, next)
);

