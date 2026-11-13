# HOSPITALITY
### Holistic Optimization System for Policy-Integrated Admission & Treatment Intelligence

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%7C%20Mongoose-brightgreen.svg)](https://www.mongodb.com/)
[![Swagger](https://img.shields.io/badge/OpenAPI-3.0%20Swagger-green.svg)](https://swagger.io/)
[![Tests](https://img.shields.io/badge/Tests-55%20Passed-success.svg)]()

---

## 1. Project Overview

**HOSPITALITY** is an intelligent health insurance assistance platform designed to empower policyholders before, during, and after hospital admissions. Health insurance policies are notoriously opaque, fraught with hidden sub-limits, arbitrary proportionate deductions, complex waiting periods, and unexpected claim rejections. 

HOSPITALITY provides a transparent, deterministic software backbone that demystifies policy terms, computes exact out-of-pocket room upgrade costs, audits itemized hospital bills for duplicate billing, tracks claims through a 12-stage lifecycle, and helps users compare insurance products with unbiased multi-factor scoring.

---

## 2. Problem Statement & Objectives

### The Problem
1. **Surprise Medical Deductions:** Patients frequently discover that exceeding their daily room rent limit by even ₹1,000 triggers massive "proportionate deductions" across doctor fees, nursing charges, and operation theater fees.
2. **Illegal Pharmacy & Implant Cuts:** Despite clear IRDAI circulars prohibiting proportionate deductions on medicines and implants, TPAs and insurers frequently apply blanket deductions.
3. **Bill Inaccuracies & Phantom Charges:** Hospital bills often contain duplicate line items, non-payable consumables, or inconsistent totals.
4. **Opaque Claim Lifecycles:** Patients are left uninformed during the critical pre-authorization and final settlement phases.

### Objectives of HOSPITALITY
- **Strictly Deterministic Calculations:** Payouts, eligibility, and deductions are computed by a verified TypeScript rules engine—**never** by probabilistic LLM hallucination.
- **IRDAI Compliance:** Explicitly enforces IRDAI circulars (including circular `IRDAI/HLT/REG/CIR/193/09/2020 Clause 5.2`) protecting medicines and diagnostics.
- **Privacy & Ownership:** Multi-tenant user isolation, encrypted storage abstractions, and secure cryptographic view-only sharing links.
- **AI-Ready Boundary:** Seamless async integration contracts prepared for future multimodal document extraction and natural language grievance letter generation.

---

## 3. Technology Stack

- **Runtime Environment:** Node.js (v24+)
- **Core Framework:** Express.js 4.x
- **Language:** TypeScript 5.9 (Strict Mode)
- **Database & ODM:** MongoDB Atlas / Local MongoDB, Mongoose 8.x
- **Request Validation:** Zod 3.x
- **Authentication & Security:** JWT (jsonwebtoken), bcryptjs, Helmet, CORS, Express-Rate-Limit
- **File Handling:** Multer (PDF validation, 10MB limits, local storage abstraction)
- **API Documentation:** Swagger UI (OpenAPI 3.0 specification)
- **Testing Engine:** Jest, ts-jest, Supertest

---

## 4. Architecture Overview

HOSPITALITY adopts a clean, layered architectural pattern:

```
[ HTTP Request ] 
       │
       ▼
[ Security Middlewares: Helmet, CORS, RateLimiter ]
       │
       ▼
[ Express Router (/api/v1) ] -> [ Zod Request Validation ]
       │
       ▼
[ Controller Layer ] -> DTO Mapping & Status Codes
       │
       ▼
[ Business Services & Pure Deterministic Rules Engine ]
  ├── WaitingPeriodService (Exact Calendar Math)
  ├── ProportionateDeductionService (IRDAI Clause 5.2)
  ├── RoomUpgradeService (What-If Financial Impact)
  ├── CoverageEvaluationService (Master Orchestrator)
  ├── BillAuditService (Duplicate & Consumables Audit)
  ├── FindInsuranceService (Multi-Factor Scoring)
  └── ShareService (Cryptographic View-Only Tokens)
       │
       ▼
[ Data Layer: Mongoose Models & Storage Abstraction ]
       │
       ▼
[ MongoDB Atlas ]
```

---

## 5. Folder Structure

```
HOSPITALITY/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment, database, and Swagger configuration
│   │   ├── constants/       # IRDAI clauses, claim stages, user roles, taxonomies
│   │   ├── controllers/     # HTTP endpoint handlers
│   │   ├── middleware/      # Auth, RBAC, Zod validation, error handler, rate limiters
│   │   ├── models/          # Strongly-typed Mongoose database schemas
│   │   ├── routes/          # Express route definitions (/api/v1/...)
│   │   ├── services/        # Business logic & Deterministic Rules Engine
│   │   │   └── rules/       # Coverage evaluation, proportionate deduction, waiting periods
│   │   ├── types/           # Custom Express types & calculation interfaces
│   │   ├── utils/           # Logger, standard response envelopes, bcrypt/jwt helpers
│   │   ├── validators/      # Zod request validation schemas
│   │   ├── app.ts           # Configured Express application instance
│   │   └── server.ts        # Server entry point & connection lifecycle
│   ├── tests/
│   │   ├── unit/            # Unit tests for rules, auth, validators, storage
│   │   └── integration/     # Integration tests with Supertest (all modules)
│   ├── uploads/             # Directory for local development file storage
│   ├── .env.example         # Template for environment variables
│   ├── package.json         # Scripts and dependencies
│   └── tsconfig.json        # TypeScript configuration
├── docs/
│   ├── AI_INTEGRATION_CONTRACT.md  # Detailed API contract for future AI subsystems
│   ├── API_CONTRACT.md             # Complete REST API specification
│   ├── ARCHITECTURE.md             # Architectural design principles and diagrams
│   ├── DATA_DICTIONARY.md          # Database schema specifications and constraints
│   └── IMPLEMENTATION_STATUS.md    # Feature status and verification audit
├── README.md
├── HANDOVER_REMAINING_WORK.md
└── .gitignore
```

---

## 6. Prerequisites

- **Node.js:** v18.x, v20.x, or v24.x
- **npm:** v9.x or higher
- **MongoDB:** MongoDB Atlas connection URI or local MongoDB instance (optional during pure unit testing)

---

## 7. Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Hospitality/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` as appropriate:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/hospitality_dev
   JWT_SECRET=your_super_secret_jwt_signing_key_at_least_16_chars
   JWT_EXPIRES_IN=7d
   CLIENT_ORIGIN=http://localhost:3000
   UPLOAD_DIRECTORY=./uploads
   MAX_FILE_SIZE=10485760
   ```

4. **Build TypeScript for production:**
   ```bash
   npm run build
   ```

---

## 8. Running the Backend

### Development Mode (with hot-reloading)
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server starts on port `5000` (or `PORT` from `.env`).

- **Health Check:** `http://localhost:5000/health`
- **Swagger Documentation:** `http://localhost:5000/api/v1/docs`
- **Raw OpenAPI Spec:** `http://localhost:5000/api/v1/docs.json`

---

## 9. Running the Test Suite

The test suite covers pure calculation unit tests and Supertest integration tests across all modules.

```bash
# Run all 55 tests across all 10 suites
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

**Test Verification Summary:**
```
Test Suites: 10 passed, 10 total
Tests:       55 passed, 55 total
Time:        ~19s
```

---

## 10. Key API Groups Summary

| Endpoint Group | Base Route | Key Operations |
| :--- | :--- | :--- |
| **System** | `/health`, `/` | System health status, version, database connection state |
| **Auth** | `/api/v1/auth` | User registration, login, profile retrieval, profile updates |
| **Policies** | `/api/v1/policies` | Policy CRUD, manual field confirmation, audit history |
| **Documents** | `/api/v1/policies/:id/documents` | PDF policy schedule uploads, metadata, secure download |
| **Rules Engine** | `/api/v1/rules` | Coverage evaluation, IRDAI proportionate deductions, room upgrades |
| **Waiting Periods** | `/api/v1/waiting-periods` | Date-based continuous coverage eligibility checking |
| **Hospitals** | `/api/v1/hospitals` | Hospital network directory, city/pincode search, cashless status |
| **Claims** | `/api/v1/claims` | 12-stage claim tracking, transition validation, status history |
| **Bill Audit** | `/api/v1/bill-audits` | Line-item analysis, duplicate detection, consumables deduction |
| **Rejections** | `/api/v1/rejections` | Rejection classification, shortfall calculation, appeal readiness |
| **Find Insurance** | `/api/v1/insurance` | Multi-factor transparent policy comparison and ranking |
| **Real Voices** | `/api/v1/reviews` | Verified policyholder customer reviews, statistics, moderation |
| **Sharing** | `/api/v1/share-links` | Cryptographic view-only links, access count, revocation |
| **Shared View** | `/api/v1/shared/:token` | Public view-only sanitized resource viewer |

---

## 11. Strict Non-AI Boundary & Future Roadmap

- **Deterministic Core:** All calculations regarding financial figures, deduction percentages, waiting days, and admissible payouts are 100% deterministic code.
- **Future AI Subsystem:** The future AI team will integrate via the asynchronous contract defined in [`docs/AI_INTEGRATION_CONTRACT.md`](docs/AI_INTEGRATION_CONTRACT.md). The AI will assist with document schedule OCR extraction (into user-confirmable draft fields) and empathetic appeal letter phrasing.
- **Future React Frontend:** A standalone React / Next.js single-page application will connect to these REST endpoints using standard Bearer JWT tokens.

---

## 12. License

This project is licensed under the ISC License.
