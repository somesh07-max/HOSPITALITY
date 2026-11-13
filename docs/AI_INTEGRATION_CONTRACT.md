# HOSPITALITY — AI Integration Contract & Specification

**Document Version:** 1.0.0  
**Status:** Canonical Interface Specification for Future AI Subsystem  
**Scope:** Strict boundary definition between the deterministic backend and future AI modules.

---

## 1. Architectural Philosophy & Strict Non-AI Boundary

The **HOSPITALITY** platform is designed with a fundamental separation of concerns:

> **Core Invariant:**  
> **The LLM / AI system MUST NEVER calculate payout amounts, eligibility, deductions, copays, waiting periods, sub-limits, or claim financial decisions.**  
> All financial, legal, and mathematical evaluations are strictly executed by the **TypeScript Deterministic Rules Engine**.

The role of future AI is strictly auxiliary: natural language explanation, document text parsing/extraction to proposed draft schemas, semantic assistance, and conversational guidance. The core backend is 100% operational, secure, and complete without any AI provider or connection.

---

## 2. Future AI Responsibilities vs. Deterministic Backend

| Module / Responsibility | Handled by Deterministic Backend | Handled by Future AI Service |
| :--- | :--- | :--- |
| **Policy Data Extraction** | Stored in structured MongoDB schemas; manually editable & confirmable. | OCR + Multimodal extraction of policy schedules into draft JSON proposals for user confirmation. |
| **Waiting Period Calculation** | Exact calendar date arithmetic against inception & renewal dates. | Conversational explanation of why a waiting period applies to user's condition. |
| **Proportionate Deductions** | Explicit mathematical formulas with clause references and decision traces. | Translating mathematical decision traces into empathetic, plain-language patient summaries. |
| **Bill Audit** | Exact line-item arithmetic, duplicate detection, sublimit capping, non-covered item checks. | Categorizing unstructured hospital bill line item descriptions into standard tariff codes. |
| **Claim Rejection Explainer** | Structured rejection taxonomy, delta calculation (claimed vs approved), clause mapping. | Generating step-by-step grievance appeal letter drafts based on the deterministic rejection code. |
| **Real Voices (Reviews)** | Deterministic rating aggregation, breakdown calculations, spam reporting, verified user badges. | Optional future aspect summarization (without altering actual numerical ratings). |
| **Policy Search & Scoring** | Transparent weighted multi-factor preference scoring algorithm. | Interactive conversational discovery interview that feeds preferences to the scoring engine. |

---

## 3. Integration Architecture

Future AI integrations will interface with the HOSPITALITY backend via an **Asynchronous / Webhook or Service-to-Service REST Contract**:

```
+-------------------------------------------------------------+
|                     Client Application                      |
+-------------------------------------------------------------+
               |                                 |
               v                                 v
+-------------------------------+  Webhook/    +-------------------------------+
|      HOSPITALITY Backend      | <----------> |     External AI Microservice  |
|  (Deterministic & Source of   |   Internal   |    (LLM / Vision / LangChain) |
|           Truth)              |     Auth     |                               |
+-------------------------------+              +-------------------------------+
        |               |
        v               v
  MongoDB Atlas    Secure File Storage
```

### 3.1 Communication Protocol
1. **Direct Backend API Consumption:** The AI worker authenticates with the backend using a dedicated service JWT (`role: 'ai_service'`).
2. **Draft & Staging Pattern:** AI extraction results are NEVER directly committed to active policy records. They are written to a `staged_extractions` or `draft_proposal` state.
3. **Mandatory Human-In-The-Loop Confirmation:** Every field extracted by AI requires user verification via `/api/v1/policies/:id/confirm` before the rules engine evaluates it.

---

## 4. Specific Integration Points & Data Contracts

### 4.1 Policy Schedule Extraction (Document Intelligence)
When a user uploads a policy PDF via `/api/v1/policies/:id/documents`, the backend stores the file securely and emits an extraction job event.

**Expected AI Input Payload:**
```json
{
  "jobId": "job_ext_982341",
  "policyId": "65f1a2b3c4d5e6f7a8b9c0d1",
  "documentId": "65f1a2b3c4d5e6f7a8b9c0d2",
  "documentUrl": "/api/v1/policies/65f1a2b3c4d5e6f7a8b9c0d1/documents/65f1a2b3c4d5e6f7a8b9c0d2/download",
  "mimeType": "application/pdf"
}
```

**Expected AI Output Payload:**
```json
{
  "jobId": "job_ext_982341",
  "policyId": "65f1a2b3c4d5e6f7a8b9c0d1",
  "extractedData": {
    "insurerName": { "value": "Star Health and Allied Insurance", "confidence": 0.98, "page": 1 },
    "policyName": { "value": "Family Health Optima", "confidence": 0.95, "page": 1 },
    "sumInsured": { "value": 500000, "confidence": 0.99, "page": 1 },
    "roomRentLimit": {
      "limitType": "PERCENTAGE_OF_SUM_INSURED",
      "percentage": 1.0,
      "dailyLimitAmount": 5000,
      "confidence": 0.92,
      "page": 2
    },
    "waitingPeriods": {
      "initialWaitingPeriodDays": { "value": 30, "confidence": 0.99, "page": 3 },
      "specificDiseaseWaitingPeriodMonths": { "value": 24, "confidence": 0.94, "page": 3 },
      "preExistingDiseaseWaitingPeriodMonths": { "value": 48, "confidence": 0.96, "page": 4 }
    }
  },
  "extractionStatus": "COMPLETED",
  "modelSignature": "gemini-1.5-pro-extract-v2"
}
```

### 4.2 Rejection & Short-Settlement Grievance Letter Generator
The deterministic backend classifies the rejection code (e.g. `EXCLUSION_MATERNITY`, `ROOM_RENT_CAPPING_PROPORTIONATE`). The AI service consumes the deterministic decision trace to format an appeal letter.

**Expected AI Input Payload:**
```json
{
  "claimId": "65f1a2b3c4d5e6f7a8b9c0d3",
  "rejectionCategory": "PROPORTIONATE_DEDUCTION_OVERCHARGE",
  "claimedAmount": 150000,
  "approvedAmount": 95000,
  "deductedAmount": 55000,
  "deterministicTrace": {
    "ruleId": "RULE_PROP_DEDUCTION_ROOM_RENT_V1",
    "clauseReference": "IRDAI Guidelines Circular Ref: IRDAI/HLT/REG/CIR/193/09/2020 Clause 5.2",
    "explanation": "Insurer cannot proportionately deduct medicine, pharmacy, or diagnostic costs when room rent limit is exceeded."
  },
  "requestedTone": "FORMAL_LEGAL_GRIEVANCE"
}
```

**Expected AI Output Payload:**
```json
{
  "appealLetterDraft": "To,\nThe Grievance Redressal Officer,\n[Insurer Name]...\nSubject: Formal Appeal Against Improper Proportionate Deduction on Claim #...\n\nReference: IRDAI Circular Ref: IRDAI/HLT/REG/CIR/193/09/2020...",
  "keyLegalPrecedentsCited": ["IRDAI Circular Clause 5.2 (Protection against arbitrary medicine deduction)"],
  "recommendedActionItems": [
    "Attach the hospital consolidated itemized pharmacy bills.",
    "File complaint on IRDAI Bima Bharosa portal if unresolved in 14 days."
  ]
}
```

---

## 5. Validation & Safety Enforcements

1. **Strict Type-Checking:** All incoming AI responses must be validated against backend Zod schemas (`src/validators/`). Any malformed or hallucinated attributes will be rejected with HTTP 422 Unprocessable Entity.
2. **Never Overwrite User-Confirmed Data:** If a user marked `roomRentLimit` as `CONFIRMED` in `/api/v1/policies/:id/confirm`, subsequent AI runs MUST NOT mutate this field without explicit user override.
3. **Audit Trail Logging:** Every modification suggested by an AI worker must log `updatedBy: 'AI_AGENT'` and `sourceDocumentPage` in the field audit history.

---

## 6. Error Handling & Fallbacks

- If the AI service is unreachable, returns 5xx, or times out (> 15 seconds):
  - The backend returns standard HTTP responses (`AI_SERVICE_UNAVAILABLE`).
  - Core platform flows continue without interruption: users simply enter or review their policy data manually.
- No user is ever blocked from submitting claims, calculating deductions, or auditing bills due to an external AI outage.

