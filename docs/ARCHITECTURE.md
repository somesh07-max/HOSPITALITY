# HOSPITALITY — System Architecture Document

**System Name:** HOSPITALITY (Holistic Optimization System for Policy-Integrated Admission & Treatment Intelligence)  
**Tier:** Non-AI Deterministic Core Backend  
**Architecture Paradigm:** Layered Clean Architecture (Controller - Service - Model / Engine)  

---

## 1. Architectural Overview

HOSPITALITY is structured as a modular, stateless RESTful service in TypeScript and Express.js, backed by MongoDB Atlas. It enforces strict separation between business logic, deterministic mathematical calculation, and HTTP request routing.

```
+-----------------------------------------------------------------------------------------+
|                                    Client Request                                       |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                                Middleware Pipeline                                      |
|  [Helmet] -> [CORS] -> [RateLimiter] -> [BodyParsers] -> [AuthJWT] -> [RoleGuard]       |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                                 Routing & Validation                                    |
|              Express Router (/api/v1/*)  ->  Zod Schema Validation Middleware           |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                                  Controller Layer                                       |
|             Translates HTTP requests into clean DTOs, returns standard JSON             |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                     Service Layer & Pure Deterministic Rules Engine                     |
|  - PolicyService          - RulesEngine (Pure TS)          - BillAuditService           |
|  - WaitingPeriodChecker   - ProportionateDeductionSim      - RoomUpgradeSim             |
|  - ClaimTrackingService   - HospitalService                - FindInsuranceScorer        |
|  - RealVoicesService      - SecureShareService             - StorageService             |
+-----------------------------------------------------------------------------------------+
                        |                                       |
                        v                                       v
+---------------------------------------------+   +---------------------------------------+
|          Data Layer (Mongoose ODM)          |   |       Storage Provider Abstraction    |
|   User, Policy, Claim, Hospital, Review,    |   |    Local File Storage (Dev)           |
|   BillAudit, ShareLink, PolicyDocument      |   |    S3 / GCS Storage Compatible (Prod) |
+---------------------------------------------+   +---------------------------------------+
                        |
                        v
+---------------------------------------------+
|             MongoDB Atlas Database          |
+---------------------------------------------+
```

---

## 2. Core Architectural Principles

### 2.1 Determinism Over Probabilistic Inference
- No financial, eligibility, or deduction calculation is delegated to probabilistic models.
- All calculation rules carry explicit **Rule IDs**, **IRDAI or Insurer Clause References**, mathematical formulas, and immutable **Decision Traces**.

### 2.2 Security & Least Privilege
- **JWT Authentication:** Short/configurable session tokens with cryptographically signed user IDs and roles.
- **Resource Ownership Isolation:** Every policy, document, claim, and audit is strictly verified against `req.user.id`. Cross-user access is impossible unless accessed via a valid, unexpired, non-revoked `ShareLink`.
- **Role-Based Access Control (RBAC):** Privileged actions (such as review moderation or hospital verification management) require `role: 'admin'`.
- **Credential Protection:** Passwords hashed with bcrypt (salt rounds: 10). Hashes are explicitly stripped from Mongoose serialization via `select: false` and `toJSON` transforms.

### 2.3 Storage Abstraction
- File storage interfaces are defined via an abstract `IStorageService` interface (`src/services/storage.service.ts`).
- Development uses `LocalStorageService` with strict file-type checks (magic-bytes/MIME + extension), sanitized filenames, and restricted upload directories.
- Cloud storage (AWS S3, Google Cloud Storage, Azure Blob) can be swapped without touching controllers or business services.

### 2.4 Resilient Error Handling
- Standardized API response format for both successes and errors:
  - Success: `{ success: true, data: ..., message?: string }`
  - Error: `{ success: false, error: { code: string, message: string, details?: any } }`
- Global error-handling middleware catches all unhandled exceptions, logs them with stack traces in development, and returns sanitised HTTP error envelopes.

---

## 3. Directory Layout & Responsibility Matrix

```
backend/
├── src/
│   ├── config/          # Environment variables, database connection, global configuration
│   ├── constants/       # Enums, rule IDs, claim stages, rejection taxonomies, IRDAI clauses
│   ├── controllers/     # Express HTTP handlers, request unwrapping, status code mapping
│   ├── middleware/      # Auth, RBAC, Zod validation, error handler, rate limiters
│   ├── models/          # Mongoose schemas, indexes, schema hooks, virtuals
│   ├── routes/          # Express route definitions grouped by domain (/api/v1/...)
│   ├── services/        # Business logic, calculation engines, storage abstraction
│   ├── types/           # TypeScript interfaces, custom express types, calculation DTOs
│   ├── utils/           # Helper functions, date arithmetic, logger, response wrappers
│   ├── validators/      # Zod validation schemas for request bodies, queries, and params
│   ├── app.ts           # Configured Express application export (for tests and server)
│   └── server.ts        # Server bootstrap, DB connection lifecycle, graceful shutdown
├── tests/
│   ├── fixtures/        # Synthetic and verified test datasets
│   ├── unit/            # Isolated unit tests for rules engine, checkers, calculators
│   └── integration/     # End-to-end API integration tests using Supertest
├── uploads/             # Local storage directory for document files
├── .env.example         # Template for environment configuration
├── package.json         # Dependencies and execution scripts
└── tsconfig.json        # TypeScript compiler configuration
```

---

## 4. Scalability & Extensibility

1. **Stateless Node.js Instances:** The backend retains zero in-memory session state, allowing horizontal autoscaling behind reverse proxies (Nginx, Cloudflare, AWS ALB).
2. **Indexed Queries:** All frequently filtered and sorted fields (such as `user`, `policyNumber`, `claimId`, `insurerName`, `networkStatus`, `status`) have compound MongoDB indexes.
3. **Pluggable Rules Engine:** Insurer-specific calculation rules implement a standard `IProportionateDeductionRule` interface, enabling quick addition of new insurer clauses without code refactoring.

