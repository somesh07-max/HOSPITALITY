import { Router } from 'express';
import { authRouter } from './auth.routes';
import { policyRouter } from './policy.routes';
import { documentRouter } from './document.routes';
import { rulesRouter } from './rules.routes';
import { waitingPeriodRouter } from './waitingPeriod.routes';
import { hospitalRouter } from './hospital.routes';
import { claimRouter } from './claim.routes';
import { billAuditRouter } from './billAudit.routes';
import { rejectionRouter } from './rejection.routes';
import { insuranceRouter } from './insurance.routes';
import { reviewRouter } from './review.routes';
import { shareRouter } from './share.routes';
import { shareController } from '../controllers/share.controller';

export const apiV1Router = Router();

apiV1Router.get('/status', (_req, res) => {
  res.json({
    message: 'HOSPITALITY API v1 operational',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

apiV1Router.use('/auth', authRouter);
apiV1Router.use('/policies', policyRouter);
apiV1Router.use('/documents', documentRouter);
apiV1Router.use('/rules', rulesRouter);
apiV1Router.use('/waiting-periods', waitingPeriodRouter);
apiV1Router.use('/hospitals', hospitalRouter);
apiV1Router.use('/claims', claimRouter);
apiV1Router.use('/bill-audits', billAuditRouter);
apiV1Router.use('/rejections', rejectionRouter);
apiV1Router.use('/insurance', insuranceRouter);
apiV1Router.use('/reviews', reviewRouter);
apiV1Router.use('/share-links', shareRouter);

// Public View-Only Share Token resolution route
apiV1Router.get('/shared/:token', (req, res, next) =>
  shareController.getSharedResource(req, res, next)
);
