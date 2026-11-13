# HOSPITALITY — REST API Specification & Contract

**Base URL:** `/api/v1`  
**Authentication Scheme:** Bearer JWT (`Authorization: Bearer <token>`)  
**Format:** JSON (`Content-Type: application/json` except file upload multipart)  

---

## 1. Standard Response Envelope

### Success Response (HTTP 200 / 201)
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation"
}
```

### Error Response (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_SERVER_ERROR",
    "message": "Descriptive error message",
    "details": []
  }
}
```

---

## 2. API Endpoints

### 2.1 Health Check
- **`GET /health`**
  - **Auth:** None
  - **Response 200:** `{ "status": "UP", "timestamp": "...", "database": "CONNECTED | DISCONNECTED", "version": "1.0.0" }`

---

### 2.2 Authentication Module
- **`POST /api/v1/auth/register`**
  - **Auth:** None (Rate Limited: 20 req/15min)
  - **Body:** `{ "name": "Rajesh Kumar", "email": "rajesh@example.com", "password": "SecurePassword123!" }`
  - **Response 201:** `{ "user": { "id": "...", "name": "...", "email": "...", "role": "user" }, "token": "jwt..." }`
  - **Error 409:** Email already registered.

- **`POST /api/v1/auth/login`**
  - **Auth:** None (Rate Limited)
  - **Body:** `{ "email": "rajesh@example.com", "password": "SecurePassword123!" }`
  - **Response 200:** `{ "user": { "id": "...", "name": "...", "email": "...", "role": "user" }, "token": "jwt..." }`
  - **Error 401:** Invalid email or password.

- **`GET /api/v1/auth/me`**
  - **Auth:** Bearer Token
  - **Response 200:** User profile without password hash.

- **`PATCH /api/v1/auth/profile`**
  - **Auth:** Bearer Token
  - **Body:** Optional `{ "name": "..." }`
  - **Response 200:** Updated profile.

---

### 2.3 Insurance Policy Management
- **`POST /api/v1/policies`**
  - **Auth:** Bearer Token
  - **Body:** Full or partial policy specification:
    ```json
    {
      "insurerName": "Star Health",
      "policyName": "Family Health Optima",
      "policyNumber": "POL-STAR-2026-001",
      "policyType": "FAMILY_FLOATER",
      "sumInsured": 500000,
      "premium": 18500,
      "inceptionDate": "2023-01-15T00:00:00.000Z",
      "expiryDate": "2027-01-14T00:00:00.000Z",
      "renewalDate": "2026-01-15T00:00:00.000Z",
      "membersCovered": [{ "name": "Rajesh Kumar", "relationship": "SELF", "age": 38 }],
      "roomRentLimit": { "limitType": "PERCENTAGE", "percentage": 1.0, "dailyLimit": 5000 },
      "copayment": { "hasCopay": false, "percentage": 0, "appliesTo": "NONE" },
      "deductible": { "hasDeductible": false, "amount": 0, "deductibleType": "PER_CLAIM" },
      "waitingPeriods": { "initialWaitingPeriodDays": 30, "specificDiseaseMonths": 24, "preExistingDiseaseMonths": 36 },
      "exclusions": ["Maternity", "Cosmetic Surgery", "Weight Loss"]
    }
    ```
  - **Response 201:** Created policy resource.

- **`GET /api/v1/policies`**
  - **Auth:** Bearer Token
  - **Query:** `page`, `limit`, `confirmationStatus`
  - **Response 200:** List of user's own policies.

- **`GET /api/v1/policies/:id`**
  - **Auth:** Bearer Token (Owner or Admin)
  - **Response 200:** Detailed policy object.

- **`PUT /api/v1/policies/:id`**
  - **Auth:** Bearer Token (Owner)
  - **Response 200:** Updated policy.

- **`DELETE /api/v1/policies/:id`**
  - **Auth:** Bearer Token (Owner)
  - **Response 200:** Deletion confirmation.

- **`POST /api/v1/policies/:id/confirm`**
  - **Auth:** Bearer Token (Owner)
  - **Body:**
    ```json
    {
      "fieldConfirmations": [
        { "fieldName": "roomRentLimit", "status": "CONFIRMED", "notes": "Verified against Clause 3.1" },
        { "fieldName": "sumInsured", "status": "CONFIRMED" }
      ],
      "markAllConfirmed": false
    }
    ```
  - **Response 200:** Updated policy with confirmation audit trail.

---

### 2.4 Policy Document Upload & Management
- **`POST /api/v1/policies/:id/documents`**
  - **Auth:** Bearer Token (Owner)
  - **Content-Type:** `multipart/form-data`
  - **Form Fields:** `file` (PDF file, max 10MB), `documentType` (`POLICY_SCHEDULE` | `POLICY_WORDING` | `RENEWAL_RECEIPT`)
  - **Response 201:** Stored document metadata.
  - **Error 400:** Unsupported MIME type, file size exceeded, or not a PDF.

- **`GET /api/v1/policies/:id/documents`**
  - **Auth:** Bearer Token (Owner)
  - **Response 200:** List of documents associated with the policy.

- **`GET /api/v1/documents/:id/download`**
  - **Auth:** Bearer Token (Owner or Admin)
  - **Response 200:** Secure file binary stream with appropriate `Content-Disposition`.

- **`DELETE /api/v1/documents/:id`**
  - **Auth:** Bearer Token (Owner)
  - **Response 200:** Document deleted from disk and database.

---

### 2.5 Deterministic Rules Engine
- **`POST /api/v1/rules/evaluate`**
  - **Auth:** Bearer Token
  - **Body:**
    ```json
    {
      "policyId": "65f1a2b3c4d5e6f7a8b9c0d1",
      "treatmentDate": "2026-05-10T00:00:00.000Z",
      "diseaseName": "Cataract",
      "isPreExisting": false,
      "claimedAmount": 45000,
      "roomRentDaily": 4500,
      "daysInHospital": 2,
      "roomType": "SINGLE_PRIVATE"
    }
    ```
  - **Response 200:** Deterministic evaluation, waiting period check, sublimit assessment, and complete decision trace.

- **`POST /api/v1/rules/proportionate-deduction`**
  - **Auth:** Bearer Token
  - **Body:**
    ```json
    {
      "policyId": "65f1a2b3c4d5e6f7a8b9c0d1",
      "roomRentLimit": 5000,
      "actualRoomRent": 8000,
      "roomCategoryOccupied": "DELUXE_ROOM",
      "eligibleRoomCategory": "STANDARD_ROOM",
      "billItems": [
        { "category": "ROOM_RENT", "amount": 24000, "isProportionateEligible": false },
        { "category": "DOCTOR_FEE", "amount": 30000, "isProportionateEligible": true },
        { "category": "SURGERY_CHARGES", "amount": 60000, "isProportionateEligible": true },
        { "category": "PHARMACY_MEDICINE", "amount": 20000, "isProportionateEligible": false }
      ]
    }
    ```
  - **Response 200:**
    ```json
    {
      "ruleId": "RULE_PROP_DEDUCTION_STANDARD_IRDAI",
      "clauseReference": "IRDAI/HLT/REG/CIR/193/09/2020 Clause 5.2",
      "verificationStatus": "VERIFIED_OFFICIAL",
      "proportionateRatio": 0.625,
      "totalClaimed": 134000,
      "totalDisallowedDeduction": 33750,
      "admissibleAmount": 100250,
      "decisionTrace": [ ... ],
      "disclaimer": "This calculation is a deterministic estimate based on IRDAI guidelines and policy conditions. It does not guarantee insurer settlement."
    }
    ```

- **`POST /api/v1/rules/room-upgrade`**
  - **Auth:** Bearer Token
  - **Body:**
    ```json
    {
      "policyId": "65f1a2b3c4d5e6f7a8b9c0d1",
      "stayDays": 4,
      "currentRoomCategory": "STANDARD_ROOM",
      "targetRoomCategory": "SUITE",
      "currentRoomDailyRate": 5000,
      "targetRoomDailyRate": 12000,
      "estimatedAssociatedProportionateExpenses": 100000
    }
    ```
  - **Response 200:** Room upgrade what-if financial impact, direct differential cost, cascaded proportionate deduction cost, and total out-of-pocket projection.

---

### 2.6 Waiting Period & Inception Date Checker
- **`POST /api/v1/waiting-periods/check`**
  - **Auth:** Bearer Token
  - **Body:**
    ```json
    {
      "inceptionDate": "2024-01-01T00:00:00.000Z",
      "treatmentDate": "2026-03-15T00:00:00.000Z",
      "diseaseType": "SPECIFIC_DISEASE",
      "diseaseName": "Hernia",
      "initialWaitingDays": 30,
      "specificDiseaseWaitingMonths": 24,
      "pedWaitingMonths": 36,
      "isPreExisting": false
    }
    ```
  - **Response 200:**
    ```json
    {
      "isCovered": true,
      "waitingPeriodType": "SPECIFIC_DISEASE",
      "requiredPeriodMonths": 24,
      "elapsedMonths": 26.4,
      "completionDate": "2026-01-01T00:00:00.000Z",
      "daysRemaining": 0,
      "explanation": "Specific disease waiting period of 24 months completed on Jan 1, 2026."
    }
    ```

---

### 2.7 Hospital Matching Module
- **`GET /api/v1/hospitals`**
  - **Auth:** Bearer Token
  - **Query:** `search`, `city`, `pincode`, `insurerName`, `networkStatus`
  - **Response 200:** Filtered hospital directory with network cashless tags.

- **`GET /api/v1/hospitals/:id`**
  - **Auth:** Bearer Token
  - **Response 200:** Hospital detail with insurer cashless and TPA relationships.

---

### 2.8 Claim Journey Tracking
- **`POST /api/v1/claims`**
  - **Auth:** Bearer Token
  - **Body:** `{ "policyId": "...", "hospitalId": "...", "claimType": "CASHLESS", "claimedAmount": 120000 }`
  - **Response 201:** Created claim with initial stage `POLICY_CONFIRMED`.

- **`GET /api/v1/claims`**
  - **Auth:** Bearer Token
  - **Response 200:** User's active and past claims.

- **`GET /api/v1/claims/:id`**
  - **Auth:** Bearer Token (Owner or Admin)
  - **Response 200:** Full claim journey with chronological stage history.

- **`PATCH /api/v1/claims/:id/status`**
  - **Auth:** Bearer Token (Owner or Admin)
  - **Body:**
    ```json
    {
      "newStage": "PRE_AUTH_APPROVED",
      "remarks": "Initial cashless approval received for Rs. 85,000",
      "approvedAmount": 85000,
      "statusSource": "INSURER_CONFIRMED"
    }
    ```
  - **Response 200:** Updated claim with validated stage transition.

---

### 2.9 Final Bill Audit Module
- **`POST /api/v1/bill-audits`**
  - **Auth:** Bearer Token
  - **Body:**
    ```json
    {
      "policyId": "65f1a2b3c4d5e6f7a8b9c0d1",
      "claimId": "65f1a2b3c4d5e6f7a8b9c0d3",
      "items": [
        { "description": "Bed Charges - Deluxe", "category": "ROOM_RENT", "amount": 32000 },
        { "description": "Bed Charges - Deluxe", "category": "ROOM_RENT", "amount": 32000 },
        { "description": "Surgical Gloves & PPE Kit", "category": "NON_PAYABLE_CONSUMABLES", "amount": 4500 },
        { "description": "Consultation Fee - Dr. Sharma", "category": "DOCTOR_FEE", "amount": 15000 }
      ]
    }
    ```
  - **Response 201:** Audit report identifying duplicate billing, disallowed consumables, and projected payable sum.

- **`GET /api/v1/bill-audits/:id`**
  - **Auth:** Bearer Token (Owner)
  - **Response 200:** Detailed stored audit findings.

---

### 2.10 Claim Rejection & Short-Settlement Explainer
- **`POST /api/v1/rejections/record`**
  - **Auth:** Bearer Token
  - **Body:**
    ```json
    {
      "claimId": "65f1a2b3c4d5e6f7a8b9c0d3",
      "claimedAmount": 150000,
      "approvedAmount": 95000,
      "rejectionCategory": "PROPORTIONATE_DEDUCTION",
      "insurerRemarks": "Room rent limit exceeded, proportionate deduction applied to doctor and OT charges."
    }
    ```
  - **Response 201:** Categorized record with structured grievance appeal recommendations.

---

### 2.11 Find Insurance (Discovery & Comparison)
- **`POST /api/v1/insurance/compare`**
  - **Auth:** Bearer Token or Public
  - **Body:**
    ```json
    {
      "age": 35,
      "city": "Bengaluru",
      "familyMembersCount": 3,
      "policyType": "FAMILY_FLOATER",
      "requiredSumInsured": 1000000,
      "budget": 25000,
      "preferences": {
        "noRoomRentCapping": true,
        "zeroCopay": true,
        "lowWaitingPeriod": true,
        "restorationBenefit": true
      }
    }
    ```
  - **Response 200:** Ranked policy options with transparent multi-factor scoring breakdown, pros, cons, and data source labels.

- **`GET /api/v1/insurance/providers`**
  - **Auth:** Public
  - **Response 200:** Verified list of insurance companies.

---

### 2.12 Real Voices (Genuine Customer Reviews)
- **`POST /api/v1/reviews`**
  - **Auth:** Bearer Token
  - **Body:**
    ```json
    {
      "insurerName": "HDFC ERGO",
      "policyName": "Optima Secure",
      "category": "CASHLESS_EXPERIENCE",
      "rating": 5,
      "reviewText": "Cashless pre-authorization was approved within 90 minutes at Apollo Hospital.",
      "experienceDate": "2026-02-10T00:00:00.000Z",
      "claimId": "65f1a2b3c4d5e6f7a8b9c0d3"
    }
    ```
  - **Response 201:** Recorded review with automated verification badge (`VERIFIED_CLAIM` or `VERIFIED_POLICYHOLDER`).

- **`GET /api/v1/reviews`**
  - **Auth:** Public / Bearer Token
  - **Query:** `insurerName`, `category`, `rating`, `page`, `limit`
  - **Response 200:** Paginated authentic reviews.

- **`GET /api/v1/reviews/stats`**
  - **Auth:** Public
  - **Query:** `insurerName`
  - **Response 200:** Aggregated breakdown, average rating, and count per category. Returns "Insufficient verified reviews available." if review count is 0.

- **`POST /api/v1/reviews/:id/report`**
  - **Auth:** Bearer Token
  - **Body:** `{ "reason": "Spam or promotional content" }`
  - **Response 200:** Report incremented.

- **`PATCH /api/v1/reviews/:id/moderate`**
  - **Auth:** Admin Only
  - **Body:** `{ "moderationStatus": "APPROVED" | "REJECTED" }`
  - **Response 200:** Moderation state updated.

---

### 2.13 Secure View-Only Sharing
- **`POST /api/v1/share-links`**
  - **Auth:** Bearer Token
  - **Body:**
    ```json
    {
      "resourceType": "POLICY",
      "resourceId": "65f1a2b3c4d5e6f7a8b9c0d1",
      "expiresInHours": 48
    }
    ```
  - **Response 201:** `{ "token": "a1b2c3d4...", "shareUrl": "/api/v1/shared/a1b2c3d4...", "expiresAt": "..." }`

- **`GET /api/v1/shared/:token`**
  - **Auth:** None (View-only token in URL)
  - **Response 200:** Sanitized resource details (personal identifiers and documents redacted).
  - **Error 404 / 410:** Token expired, revoked, or invalid.

- **`DELETE /api/v1/share-links/:id`**
  - **Auth:** Bearer Token (Owner)
  - **Response 200:** Revocation confirmation.

