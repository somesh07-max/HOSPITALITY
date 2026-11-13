# HOSPITALITY — Comprehensive Handover & Remaining Work Document

**Document Version:** 1.0.0  
**Target Audience:** Succeeding Senior Backend Engineer / AI Engineer / LLM Assistant  
**Date of Handover:** 2026-11-13T23:55:00+05:30  
**Repository State:** Non-AI Core Backend Fully Implemented, Built, Tested (55/55 Passing Tests), and Documented.

---

## 1. Project Overview

**HOSPITALITY** (Holistic Optimization System for Policy-Integrated Admission & Treatment Intelligence) is an intelligent health insurance platform. Its objective is to help patients and families:
- Comprehend their health insurance policies (room rent limits, waiting periods, sub-limits, exclusions).
- Deterministically simulate proportionate deductions under official IRDAI circulars (specifically preventing illegal deductions on pharmacy, diagnostics, and implants).
- Simulate what-if financial impacts of upgrading hospital room categories before admission.
- Search and match network hospitals offering cashless treatment.
- Track claims through a rigorous 12-stage lifecycle with state-machine transition integrity.
- Audit itemized hospital bills for duplicate line items, non-payable consumables, and total discrepancies.
- Document and classify claim rejections with actionable appeal plans.
- Compare insurance products using a transparent, multi-factor preference scoring algorithm.
- Read and submit authentic, verified customer reviews (Real Voices).
- Generate secure, time-limited, view-only sharing links for family members or caregivers.

---

## 2. Technology Stack & Key Dependencies

- **Node.js:** 24.16.0 (compatible with 18.x, 20.x, 22.x, 24.x)
- **Express.js:** 4.21.2
- **TypeScript:** 5.7.3 / 5.9.3 (Strict mode, ES2022 target, CommonJS module resolution)
- **Database:** MongoDB Atlas / Local MongoDB, Mongoose 8.10.1
- **Validation:** Zod 3.24.2
- **Security:**
  - `bcryptjs` 2.4.3 (Password hashing with salt rounds 10)
  - `jsonwebtoken` 9.0.2 (Bearer token generation and claims verification)
  - `helmet` 8.0.0 (Secure HTTP response headers)
  - `cors` 2.8.5 (Configurable origins)
  - `express-rate-limit` 7.5.0 (Global and auth-specific rate limiting)
- **File Uploads & Storage:** `multer` 1.4.5-lts.1 (PDF MIME & extension validation, 10MB limits, storage abstraction interface)
- **API Documentation:** `swagger-ui-express` 5.0.1 (OpenAPI 3.0 specification)
- **Testing:** `jest` 29.7.0, `ts-jest` 29.2.5, `supertest` 7.0.0

---

## 3. Folder Structure & Layout

```
HOSPITALITY/
├── backend/
│   ├── dist/                     # Compiled JavaScript output (generated via npx tsc)
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts       # Mongoose connection lifecycle & event listeners
│   │   │   ├── env.ts            # Zod-parsed and strongly typed process.env
│   │   │   └── swagger.ts         # OpenAPI 3.0 specification and Swagger UI setup
│   │   ├── constants/
│   │   │   └── index.ts          # Claim stages, user roles, policy types, IRDAI clauses
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── billAudit.controller.ts
│   │   │   ├── claim.controller.ts
│   │   │   ├── document.controller.ts
│   │   │   ├── hospital.controller.ts
│   │   │   ├── insurance.controller.ts
│   │   │   ├── policy.controller.ts
│   │   │   ├── rejection.controller.ts
│   │   │   ├── review.controller.ts
│   │   │   ├── rules.controller.ts
│   │   │   └── share.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts           # authenticateToken & requireRole('admin')
│   │   │   ├── errorHandler.ts   # Centralized error handler (AppError, Zod, Mongoose)
│   │   │   ├── rateLimiter.ts    # Global API and strict Auth rate limiters
│   │   │   ├── upload.ts         # Multer PDF filter and size constraint
│   │   │   └── validateRequest.ts# Generic Zod validation middleware
│   │   ├── models/
│   │   │   ├── billAudit.model.ts
│   │   │   ├── claim.model.ts
│   │   │   ├── document.model.ts
│   │   │   ├── hospital.model.ts
│   │   │   ├── insuranceProduct.model.ts
│   │   │   ├── policy.model.ts
│   │   │   ├── rejection.model.ts
│   │   │   ├── review.model.ts
│   │   │   ├── shareLink.model.ts
│   │   │   └── user.model.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── billAudit.routes.ts
│   │   │   ├── claim.routes.ts
│   │   │   ├── document.routes.ts
│   │   │   ├── hospital.routes.ts
│   │   │   ├── index.ts          # Mounts all sub-routers under /api/v1
│   │   │   ├── insurance.routes.ts
│   │   │   ├── policy.routes.ts
│   │   │   ├── rejection.routes.ts
│   │   │   ├── review.routes.ts
│   │   │   ├── rules.routes.ts
│   │   │   ├── share.routes.ts
│   │   │   └── waitingPeriod.routes.ts
│   │   ├── services/
│   │   │   ├── rules/
│   │   │   │   ├── coverageEvaluation.service.ts  # Master coverage calculation
│   │   │   │   ├── proportionateDeduction.service.ts # IRDAI 2020 circular math
│   │   │   │   ├── roomUpgrade.service.ts          # What-if room simulator
│   │   │   │   └── waitingPeriod.service.ts        # Date arithmetic & PED checker
│   │   │   ├── auth.service.ts
│   │   │   ├── billAudit.service.ts
│   │   │   ├── claim.service.ts
│   │   │   ├── findInsurance.service.ts
│   │   │   ├── hospital.service.ts
│   │   │   ├── policy.service.ts
│   │   │   ├── rejection.service.ts
│   │   │   ├── review.service.ts
│   │   │   ├── share.service.ts
│   │   │   └── storage.service.ts # IStorageService abstraction
│   │   ├── types/
│   │   │   └── index.ts          # AuthenticatedUser, AuthenticatedRequest, DecisionTraceItem
│   │   ├── utils/
│   │   │   ├── auth.ts           # bcrypt hashing & jwt token helpers
│   │   │   ├── logger.ts         # Structured console logger
│   │   │   └── response.ts       # Standard success/error envelopes
│   │   ├── validators/
│   │   │   ├── additional.validator.ts
│   │   │   ├── auth.validator.ts
│   │   │   ├── claim.validator.ts
│   │   │   ├── policy.validator.ts
│   │   │   └── rules.validator.ts
│   │   ├── app.ts                # Express app definition and middleware chain
│   │   └── server.ts             # Server entry point, DB connection, graceful shutdown
│   ├── tests/
│   │   ├── integration/
│   │   │   ├── additional.test.ts # Bill audit, rejections, insurance, reviews, sharing
│   │   │   ├── auth.test.ts       # Register, login, me endpoints
│   │   │   ├── claim.test.ts      # Hospital search, claim creation, 12-stage transitions
│   │   │   ├── health.test.ts     # Health check & root endpoints
│   │   │   ├── policy.test.ts     # Policy CRUD, document upload, field confirmation
│   │   │   ├── rules.test.ts      # Proportionate deduction, room upgrade, coverage APIs
│   │   │   └── swagger.test.ts    # OpenAPI JSON spec and Swagger UI HTML
│   │   └── unit/
│   │       ├── auth.test.ts       # Password hashing, JWT claims, Zod schemas, guards
│   │       ├── policy.test.ts     # Zod schema checks, storage service traversal defense
│   │       └── rules.test.ts      # Pure math tests: waiting periods, IRDAI clause 5.2, upgrades
│   ├── uploads/                  # Local storage folder for uploaded documents
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── docs/
│   ├── AI_INTEGRATION_CONTRACT.md
│   ├── API_CONTRACT.md
│   ├── ARCHITECTURE.md
│   ├── DATA_DICTIONARY.md
│   └── IMPLEMENTATION_STATUS.md
├── README.md
├── HANDOVER_REMAINING_WORK.md
└── .gitignore
```

---

## 4. Database Models Implemented

All models reside in `backend/src/models/` and are fully typed with Mongoose `Document` and `Model`:
1. **`User` (`user.model.ts`):** `name`, `email` (unique, lowercase), `passwordHash` (`select: false`), `role` (`'user' | 'admin'`), `isActive`.
2. **`Policy` (`policy.model.ts`):** `userId`, `insurerName`, `policyName`, `policyNumber`, `policyType`, `sumInsured`, `premium`, `inceptionDate`, `expiryDate`, `renewalDate`, `membersCovered`, `roomRentLimit`, `copayment`, `deductible`, `waitingPeriods`, `diseaseSpecificRestrictions`, `exclusions`, `subLimits`, `restorationBenefit`, `confirmationStatus`, `fieldConfirmations` (audit trail), `verificationStatus`. Compound index on `{ userId: 1, policyNumber: 1 }`.
3. **`PolicyDocument` (`document.model.ts`):** `policyId`, `userId`, `originalFilename`, `storedFilename`, `filePath`, `fileSize`, `mimeType` (restricted to `application/pdf`), `documentType`, `uploadDate`.
4. **`Hospital` (`hospital.model.ts`):** `hospitalName`, `address`, `city`, `state`, `pincode`, `contactPhone`, `contactEmail`, `insurerRelationships` (array of `insurerName`, `networkStatus`, `cashlessAvailable`, `tpaName`), `verificationStatus`, `dataSource`. Indexed on `{ city: 1, hospitalName: 1 }`.
5. **`Claim` (`claim.model.ts`):** `claimNumber` (unique), `userId`, `policyId`, `hospitalId`, `claimType`, `currentStage` (12 stages), `statusSource` (`USER_REPORTED` vs `INSURER_CONFIRMED`), `claimedAmount`, `approvedAmount`, `settledAmount`, `admissionDate`, `dischargeDate`, `stageHistory` (array of `stage`, `timestamp`, `updatedBy`, `remarks`, `source`, `approvedAmount`).
6. **`BillAudit` (`billAudit.model.ts`):** `userId`, `policyId`, `claimId`, `totalBilledAmount`, `eligibleAmount`, `nonEligibleAmount`, `estimatedPayableAmount`, `items` (description, category, billedAmount, allowedAmount, isCovered, deductionReason, ruleReference), `findings` (severity: `INFO | WARNING | CRITICAL`, code, message, financialImpact).
7. **`ClaimRejectionRecord` (`rejection.model.ts`):** `userId`, `claimId`, `policyId`, `claimedAmount`, `approvedAmount`, `differenceAmount`, `rejectionCategory`, `insurerRemarks`, `deterministicClassification` (title, explanation, relevantClauses, recommendedAppealActions, appealViability), `preparedForAiContext`.
8. **`InsuranceProduct` (`insuranceProduct.model.ts`):** `insurerName`, `productName`, `planType`, `availableSumInsuredOptions`, `hasRoomRentCapping`, `roomRentCondition`, `hasCopayment`, `copayPercentage`, `pedWaitingPeriodMonths`, `specificDiseaseWaitingMonths`, `hasRestorationBenefit`, `sampleAnnualPremiumEstimate`, `importantLimitations`, `verificationStatus`.
9. **`Review` (`review.model.ts`):** `userId`, `insurerName`, `policyName`, `category` (7 categories), `rating` (1 to 5), `reviewText`, `experienceDate`, `claimId`, `verificationStatus` (`VERIFIED_POLICYHOLDER`, `VERIFIED_CLAIM`, `UNVERIFIED`), `moderationStatus` (`APPROVED`, `PENDING`, `REJECTED`), `reportCount`.
10. **`ShareLink` (`shareLink.model.ts`):** `userId`, `resourceType` (`POLICY | CLAIM | BILL_AUDIT`), `resourceId`, `token` (32-byte hex), `expiresAt`, `isRevoked`, `permission` (`VIEW_ONLY`), `accessCount`, `lastAccessedAt`.

---

## 5. Modules Completed vs. Remaining

### Completed Non-AI Backend Modules (15 / 15)
- [x] Module 1: User Authentication (Register, Login, JWT, RBAC, Profile)
- [x] Module 2: Insurance Policy Management (CRUD, Ownership checks)
- [x] Module 3: Policy Document Upload (Multer, PDF validation, Storage abstraction)
- [x] Module 4: Policy Information Confirmation (Field-level audit trail)
- [x] Module 5: Deterministic Insurance Rules Engine (Coverage orchestrator)
- [x] Module 6: Proportionate Deduction Simulator (Official IRDAI 2020 Clause 5.2)
- [x] Module 7: Room Upgrade What-If Simulator (Direct + cascaded impact)
- [x] Module 8: Waiting-Period & Inception-Date Checker (Accident waiver, PED math)
- [x] Module 9: Hospital Matching Module (Network filtering, city/pincode search)
- [x] Module 10: Claim Journey Tracking (12 stages, transition state machine)
- [x] Module 11: Final Bill Audit Module (Duplicate items, non-payable consumables)
- [x] Module 12: Claim Rejection & Short-Settlement Explainer (Taxonomy & appeal plan)
- [x] Module 13: Find Insurance Module (Transparent multi-factor preference scoring)
- [x] Module 14: Real Voices Module (Verified reviews, statistics, moderation)
- [x] Module 15: Secure View-Only Sharing (Cryptographic tokens, expiry, redaction)

### Excluded / Future Modules (Assigned to Separate Teammates / Phased)
- [ ] **AI Multimodal Extraction Service:** Assigned to AI teammate. The backend provides clean integration hooks documented in `docs/AI_INTEGRATION_CONTRACT.md`.
- [ ] **AI Appeal Letter Drafter:** Assigned to AI teammate. Context payloads are pre-packaged deterministically in `ClaimRejectionRecord.preparedForAiContext`.
- [ ] **React / Next.js Frontend:** Assigned to frontend team. The backend provides CORS, standard JSON envelopes, and Swagger documentation at `/api/v1/docs`.

---

## 6. Implemented API Endpoints

All endpoints are mounted under `/api/v1` (with health and root at `/`):

| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | System & Database Health Check |
| `GET` | `/` | None | API Welcome & Metadata |
| `GET` | `/api/v1/docs` | None | Interactive Swagger UI Documentation |
| `GET` | `/api/v1/docs.json` | None | Raw OpenAPI 3.0 JSON Specification |
| `POST` | `/api/v1/auth/register` | None | User Registration |
| `POST` | `/api/v1/auth/login` | None | User Login |
| `GET` | `/api/v1/auth/me` | Bearer | Current User Profile |
| `PATCH` | `/api/v1/auth/profile` | Bearer | Update User Profile |
| `POST` | `/api/v1/policies` | Bearer | Add Policy |
| `GET` | `/api/v1/policies` | Bearer | List User's Policies |
| `GET` | `/api/v1/policies/:id` | Bearer | Get Policy Details |
| `PUT` | `/api/v1/policies/:id` | Bearer | Update Policy Details |
| `DELETE`| `/api/v1/policies/:id` | Bearer | Delete Policy & Associated Documents |
| `POST` | `/api/v1/policies/:id/confirm` | Bearer | Update Field Confirmations & Audit Trail |
| `POST` | `/api/v1/policies/:id/documents` | Bearer | Upload PDF Policy Document |
| `GET` | `/api/v1/policies/:id/documents` | Bearer | List Documents for a Policy |
| `GET` | `/api/v1/documents/:id/download` | Bearer | Download Secure PDF Stream |
| `DELETE`| `/api/v1/documents/:id` | Bearer | Delete Policy Document |
| `POST` | `/api/v1/rules/evaluate` | Bearer | Master Coverage Calculation & Tracing |
| `POST` | `/api/v1/rules/proportionate-deduction` | Bearer | Proportionate Deduction Simulation |
| `POST` | `/api/v1/rules/room-upgrade` | Bearer | What-If Room Upgrade Cost Simulation |
| `POST` | `/api/v1/waiting-periods/check` | Bearer | Continuous Coverage & Date Checker |
| `GET` | `/api/v1/hospitals` | Bearer | Search Hospitals by City, Name, Insurer |
| `GET` | `/api/v1/hospitals/:id` | Bearer | Hospital Details |
| `POST` | `/api/v1/claims` | Bearer | Create Claim (starts at `POLICY_CONFIRMED`) |
| `GET` | `/api/v1/claims` | Bearer | List User Claims |
| `GET` | `/api/v1/claims/:id` | Bearer | Claim Journey & History |
| `PATCH` | `/api/v1/claims/:id/status` | Bearer | Advance Claim Stage (Finite State Machine) |
| `POST` | `/api/v1/bill-audits` | Bearer | Submit Bill for Deterministic Audit |
| `GET` | `/api/v1/bill-audits/:id` | Bearer | Retrieve Bill Audit Report |
| `POST` | `/api/v1/rejections/record` | Bearer | Record Claim Rejection & Generate Plan |
| `GET` | `/api/v1/rejections/claim/:claimId` | Bearer | Rejection Records by Claim |
| `POST` | `/api/v1/insurance/compare` | None/Auth | Multi-Factor Policy Comparison & Ranking |
| `GET` | `/api/v1/insurance/providers` | None | Distinct Insurer Directory |
| `GET` | `/api/v1/insurance/policies` | None | Product List |
| `POST` | `/api/v1/reviews` | Bearer | Submit Review (Automated Verification Badge) |
| `GET` | `/api/v1/reviews` | None/Auth | List Reviews with Filters |
| `GET` | `/api/v1/reviews/stats` | None | Review Statistics & Category Breakdown |
| `POST` | `/api/v1/reviews/:id/report` | Bearer | Report Suspicious Review |
| `PATCH` | `/api/v1/reviews/:id/moderate` | Admin | Moderate Review (`APPROVED` / `REJECTED`) |
| `POST` | `/api/v1/share-links` | Bearer | Create Cryptographic View-Only Token |
| `DELETE`| `/api/v1/share-links/:id` | Bearer | Revoke Share Link |
| `GET` | `/api/v1/shared/:token` | None | View Public Sanitized Resource |

---

## 7. Commands & Operations

### Installation
```bash
cd backend
npm install
```

### Environment Configuration
```bash
# In backend/ directory:
cp .env.example .env
```

### Build Command
```bash
npm run build
# Compiles src/ to dist/ with TypeScript declarations and source maps
```

### Run Commands
```bash
# Development mode with hot-reloading:
npm run dev

# Production mode:
npm run build
npm start
```

### Test Commands
```bash
# Run all 55 tests across all 10 suites:
npm test

# Run isolated unit tests:
npm run test:unit

# Run API integration tests:
npm run test:integration
```

---

## 8. Current Known Issues, Errors, or Bugs

**None.**
- TypeScript compiles cleanly (`0 errors`).
- All 10 test suites pass (`55/55 tests passing`).
- Zero open handles or memory leaks during Jest execution.
- Graceful shutdown handles `SIGINT` and `SIGTERM`.

---

## 9. Concrete Instructions for Next LLM / Developer

When you continue development on HOSPITALITY, follow these exact step-by-step instructions:

### Task 1: Setting up Real MongoDB Atlas (When Deploying to Production)
1. Obtain your MongoDB Atlas connection string (e.g. `mongodb+srv://user:pass@cluster0.mongodb.net/hospitality?retryWrites=true&w=majority`).
2. Update `MONGODB_URI` in `backend/.env`.
3. In `src/config/database.ts`, the connection is already managed. Run `npm start` to test the connection.

### Task 2: Cloud Storage Provider Swap (Optional for Production)
1. Open `src/services/storage.service.ts`.
2. Notice the `IStorageService` interface:
   ```ts
   export interface IStorageService {
     saveFile(file: Express.Multer.File, subDirectory?: string): Promise<StorageResult>;
     getFilePath(storedPath: string): string;
     deleteFile(storedPath: string): Promise<boolean>;
     fileExists(storedPath: string): Promise<boolean>;
   }
   ```
3. Implement `S3StorageService` (using `@aws-sdk/client-s3`) or `GCSStorageService` (using `@google-cloud/storage`) that implements `IStorageService`.
4. Export the instance as `storageService`. Notice that `policy.service.ts` and `document.controller.ts` will not require any changes!

### Task 3: Connecting the AI Subsystem (For the AI Teammate)
1. Read [`docs/AI_INTEGRATION_CONTRACT.md`](docs/AI_INTEGRATION_CONTRACT.md).
2. When the user uploads a policy schedule PDF via `POST /api/v1/policies/:id/documents`:
   - Emit an extraction job to the AI microservice.
   - The AI microservice returns the draft extracted fields matching `createPolicySchema`.
   - Post the extracted values to `POST /api/v1/policies/:id/confirm` as `UNCONFIRMED` drafts for user verification.
3. For grievance appeal letters:
   - Consume the payload stored in `ClaimRejectionRecord.preparedForAiContext`.
   - Feed it to your LLM prompt template to generate formal IRDAI grievance appeal letters.
4. **Invariant:** Never delegate deduction calculations or financial numbers to the LLM. Always use `src/services/rules/`.

### Task 4: Frontend Integration (For the Frontend Teammate)
1. Visit `http://localhost:5000/api/v1/docs` in your browser to inspect the interactive Swagger UI.
2. Configure your React/Next.js client to send `Authorization: Bearer <token>` on all `/api/v1/*` requests (except `/auth/login`, `/auth/register`, `/insurance/compare`, and `/shared/:token`).
3. Handle standard responses:
   - Success: `response.data.data`
   - Errors: `response.data.error.message` and `response.data.error.details`
