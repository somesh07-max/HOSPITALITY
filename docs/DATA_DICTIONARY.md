# HOSPITALITY — Data Dictionary & Database Architecture

**Database Engine:** MongoDB Atlas (Mongoose ODM)  
**Schema Standard:** Strongly-typed Mongoose Schemas with compound indexing, field-level sanitization, and Zod runtime schema mirror.

---

## 1. Schema Overview & Entity Relationships

```
             +------------------+
             |       User       |
             +------------------+
               |        |       |
     1:N       |        | 1:N   | 1:N
   +-----------+        |       +----------------+
   |                    v                        |
   v             +--------------+                v
+--------+       |    Claim     |           +----------+
| Policy |<------|              |           |  Review  |
+--------+ 1:N   +--------------+           +----------+
   |  |            |          |
   |  | 1:N        | 1:N      | 1:1
   |  +-----+      v          v
   |        |  +----------+ +-----------+
   v        +->| Document | | BillAudit |
+-------------+|          | +-----------+
| Confirmation|+----------+
+-------------+
```

---

## 2. Collection Specifications

### 2.1 Collection: `users`
Stores identity, authentication credentials, and system roles.

| Field | Type | Required | Unique | Indexed | Description & Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Yes | Yes | Primary key |
| `name` | String | Yes | No | No | Full name of the user (trim, min 2, max 100) |
| `email` | String | Yes | Yes | Yes | Normalized lowercase email address |
| `passwordHash` | String | Yes | No | No | Salted bcrypt hash; `select: false` by default |
| `role` | String | Yes | No | Yes | Enum: `['user', 'admin']`. Default: `'user'` |
| `isActive` | Boolean | Yes | No | No | Account status flag. Default: `true` |
| `createdAt` | Date | Auto | No | No | System timestamp |
| `updatedAt` | Date | Auto | No | No | System timestamp |

---

### 2.2 Collection: `policies`
Master repository for user insurance policies and detailed coverage terms.

| Field | Type | Required | Indexed | Description & Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Yes | Primary key |
| `userId` | ObjectId | Yes | Yes | Ref to `users._id` (Owner of policy) |
| `insurerName` | String | Yes | Yes | Name of insurance company (e.g., Star Health, HDFC ERGO) |
| `policyName` | String | Yes | No | Plan product name |
| `policyNumber` | String | Yes | Yes | Unique policy identifier string |
| `policyType` | String | Yes | No | Enum: `['INDIVIDUAL', 'FAMILY_FLOATER']` |
| `sumInsured` | Number | Yes | No | Total sum insured in currency units (min: 0) |
| `premium` | Number | No | No | Annual premium amount |
| `inceptionDate` | Date | Yes | Yes | Date policy originally commenced |
| `expiryDate` | Date | Yes | Yes | Current policy cycle end date |
| `renewalDate` | Date | No | No | Date policy was last renewed |
| `membersCovered`| Array | Yes | No | Sub-schema: `[{ name: String, relationship: String, dob: Date, age: Number }]` |
| `roomRentLimit` | Object | Yes | No | `{ limitType: 'PERCENTAGE' | 'FIXED' | 'NO_LIMIT', percentage?: Number, dailyLimit?: Number, icuLimitType?: String, icuDailyLimit?: Number }` |
| `copayment` | Object | Yes | No | `{ hasCopay: Boolean, percentage: Number, appliesTo: 'ALL' | 'ZONE' | 'SENIOR' | 'SPECIAL_HOSPITALS', remarks?: String }` |
| `deductible` | Object | Yes | No | `{ hasDeductible: Boolean, amount: Number, deductibleType: 'PER_CLAIM' | 'PER_YEAR' }` |
| `waitingPeriods`| Object | Yes | No | `{ initialWaitingPeriodDays: Number, specificDiseaseMonths: Number, preExistingDiseaseMonths: Number }` |
| `diseaseSpecificRestrictions` | Array | No | No | Array of `{ diseaseName: String, sublimitAmount: Number, waitingPeriodMonths: Number }` |
| `exclusions` | Array of String| No | No | Explicit standard exclusions (e.g., Maternity, Cosmetic, Dental) |
| `subLimits` | Array | No | No | Array of `{ category: String, limitAmount: Number, clauseRef?: String }` |
| `restorationBenefit` | Object | Yes | No | `{ isAvailable: Boolean, percentage: Number, triggers: String }` |
| `networkHospitalInfo` | Object | No | No | TPA details and network query links |
| `confirmationStatus` | String | Yes | Yes | Enum: `['UNCONFIRMED', 'PARTIALLY_CONFIRMED', 'CONFIRMED']`. Default: `'UNCONFIRMED'` |
| `fieldConfirmations`| Array | No | No | Sub-schema: `[{ fieldName: String, value: Any, status: 'UNCONFIRMED'|'CONFIRMED'|'NEEDS_CORRECTION', sourceDocumentId?: ObjectId, sourcePage?: Number, updatedBy: ObjectId, confirmedAt?: Date }]` |
| `verificationStatus` | String | Yes | No | Enum: `['MANUALLY_ENTERED', 'DOCUMENT_VERIFIED', 'SYNTHETIC_DATA']` |
| `createdAt` | Date | Auto | No | System timestamp |
| `updatedAt` | Date | Auto | No | System timestamp |

*Compound Indexes:* `{ userId: 1, policyNumber: 1 }` (unique), `{ userId: 1, confirmationStatus: 1 }`.

---

### 2.3 Collection: `policy_documents`
Metadata for uploaded policy documents (PDF files).

| Field | Type | Required | Indexed | Description |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Yes | Primary key |
| `policyId` | ObjectId | Yes | Yes | Ref to `policies._id` |
| `userId` | ObjectId | Yes | Yes | Ref to `users._id` (Owner) |
| `originalFilename` | String | Yes | No | Filename at upload |
| `storedFilename` | String | Yes | Yes | UUID/hash sanitized storage key |
| `filePath` | String | Yes | No | Server relative storage path |
| `fileSize` | Number | Yes | No | Size in bytes (max 10MB) |
| `mimeType` | String | Yes | No | Restricted to `application/pdf` |
| `documentType` | String | Yes | No | Enum: `['POLICY_SCHEDULE', 'POLICY_WORDING', 'RENEWAL_RECEIPT', 'OTHER']` |
| `uploadDate` | Date | Auto | No | System upload timestamp |

---

### 2.4 Collection: `hospitals`
Directory of hospital facilities, network affiliations, and cashless statuses.

| Field | Type | Required | Indexed | Description |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Yes | Primary key |
| `hospitalName` | String | Yes | Text | Hospital name (text search indexed) |
| `address` | String | Yes | No | Street address |
| `city` | String | Yes | Yes | City name (e.g., Bengaluru, Mumbai, Delhi) |
| `state` | String | Yes | No | State name |
| `pincode` | String | Yes | Yes | 6-digit postal code |
| `contactPhone` | String | No | No | Helpdesk / TPA desk phone number |
| `contactEmail` | String | No | No | Official contact email |
| `insurerRelationships` | Array | Yes | No | Array of `{ insurerName: String, networkStatus: 'IN_NETWORK' | 'OUT_OF_NETWORK' | 'EXCLUDED', cashlessAvailable: Boolean, tpaName?: String }` |
| `verificationStatus` | String | Yes | No | Enum: `['VERIFIED_OFFICIAL', 'SYNTHETIC_TEST_DATA']` |
| `dataSource` | String | Yes | No | Provenance identifier |
| `lastUpdatedDate` | Date | Yes | No | Freshness marker |

*Compound Indexes:* `{ city: 1, hospitalName: 1 }`, `{ pincode: 1 }`, Text index on `hospitalName` and `city`.

---

### 2.5 Collection: `claims`
End-to-end claim journey lifecycle with 12 standardized stages and historical transitions.

| Field | Type | Required | Indexed | Description |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Yes | Primary key |
| `claimNumber` | String | Yes | Yes | Human-readable unique claim code (e.g. `CLM-2026-88192`) |
| `userId` | ObjectId | Yes | Yes | Ref to `users._id` |
| `policyId` | ObjectId | Yes | Yes | Ref to `policies._id` |
| `hospitalId` | ObjectId | No | Yes | Ref to `hospitals._id` |
| `claimType` | String | Yes | No | Enum: `['CASHLESS', 'REIMBURSEMENT']` |
| `currentStage` | String | Yes | Yes | Enum: 12 stages (e.g., `POLICY_CONFIRMED`, `PRE_AUTH_SUBMITTED`, `CLAIM_SETTLED`, etc.) |
| `statusSource` | String | Yes | No | Enum: `['USER_REPORTED', 'INSURER_CONFIRMED']` |
| `claimedAmount` | Number | Yes | No | Total amount requested |
| `approvedAmount` | Number | No | No | Insurer approved amount |
| `settledAmount` | Number | No | No | Final disbursed payout |
| `admissionDate` | Date | No | No | Hospital admission date |
| `dischargeDate` | Date | No | No | Hospital discharge date |
| `stageHistory` | Array | Yes | No | Array of `{ stage: String, timestamp: Date, updatedBy: ObjectId, remarks?: String, source: 'USER_REPORTED' | 'INSURER_CONFIRMED' }` |
| `createdAt` | Date | Auto | No | System timestamp |
| `updatedAt` | Date | Auto | No | System timestamp |

---

### 2.6 Collection: `bill_audits`
Itemized hospital bill audit reports, error flags, and potential non-admissible deductions.

| Field | Type | Required | Indexed | Description |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Yes | Primary key |
| `userId` | ObjectId | Yes | Yes | Ref to `users._id` |
| `policyId` | ObjectId | Yes | Yes | Ref to `policies._id` |
| `claimId` | ObjectId | No | Yes | Optional ref to `claims._id` |
| `totalBilledAmount` | Number | Yes | No | Gross bill total |
| `eligibleAmount` | Number | Yes | No | Admissible amount after policy rules |
| `nonEligibleAmount` | Number | Yes | No | Total deductions (non-payable + disallowed) |
| `estimatedPayableAmount` | Number | Yes | No | Net estimated payout |
| `items` | Array | Yes | No | Array of `{ description: String, category: String, billedAmount: Number, allowedAmount: Number, isCovered: Boolean, deductionReason?: String, ruleReference?: String }` |
| `findings` | Array | Yes | No | Array of `{ severity: 'INFO' | 'WARNING' | 'CRITICAL', code: String, message: String, financialImpact: Number }` |
| `auditedAt` | Date | Auto | No | Timestamp of deterministic audit run |

---

### 2.7 Collection: `reviews` (Real Voices)
Authentic customer reviews with verifiable claims and policyholder badges.

| Field | Type | Required | Indexed | Description |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Yes | Primary key |
| `userId` | ObjectId | Yes | Yes | Ref to `users._id` |
| `insurerName` | String | Yes | Yes | Insurance company name |
| `policyName` | String | No | No | Optional policy name |
| `category` | String | Yes | Yes | Enum: `['CASHLESS_EXPERIENCE', 'REIMBURSEMENT_EXPERIENCE', 'CLAIM_PROCESSING_TIME', 'CUSTOMER_SUPPORT', 'HOSPITAL_EXPERIENCE', 'COMMUNICATION', 'OVERALL_EXPERIENCE']` |
| `rating` | Number | Yes | Yes | 1 to 5 integer |
| `reviewText` | String | Yes | No | Body of review (min 20, max 2000 chars) |
| `experienceDate` | Date | Yes | No | When the event took place |
| `claimId` | ObjectId | No | No | Optional reference validating actual claim |
| `verificationStatus` | String | Yes | Yes | Enum: `['VERIFIED_POLICYHOLDER', 'VERIFIED_CLAIM', 'UNVERIFIED']` |
| `moderationStatus` | String | Yes | Yes | Enum: `['APPROVED', 'PENDING', 'REJECTED']`. Default: `'APPROVED'` (or `'PENDING'` if flagged) |
| `reportCount` | Number | Yes | No | Number of spam/abuse reports. Default: 0 |
| `createdAt` | Date | Auto | Yes | Submission timestamp |

---

### 2.8 Collection: `share_links`
Cryptographically secure view-only tokens with automatic expiration.

| Field | Type | Required | Indexed | Description |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Yes | Primary key |
| `userId` | ObjectId | Yes | Yes | Ref to `users._id` (Owner) |
| `resourceType` | String | Yes | No | Enum: `['POLICY', 'CLAIM', 'BILL_AUDIT']` |
| `resourceId` | ObjectId | Yes | Yes | Target resource ID |
| `token` | String | Yes | Yes | Cryptographically random hex string |
| `expiresAt` | Date | Yes | Yes | Expiry cutoff date |
| `isRevoked` | Boolean | Yes | Yes | Revocation status flag. Default: `false` |
| `permission` | String | Yes | No | Fixed: `'VIEW_ONLY'` |
| `accessCount` | Number | Yes | No | Access counter. Default: 0 |
| `lastAccessedAt` | Date | No | No | Timestamp of most recent view |

