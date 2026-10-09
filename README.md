# 🚀 RECOVER-AI: Autonomous Subscription Revenue Recovery Engine

## 📖 Executive Summary
**RECOVER-AI** is an autonomous, policy-bounded AI subscription revenue recovery engine designed to solve involuntary churn (failed payments).

Instead of relying on rigid email sequences or basic chatbots, RECOVER-AI utilizes Large Language Models (LLMs) to engage customers in empathetic Promise-to-Pay (P2P) dialogues, diagnose failure root causes, and autonomously negotiate recovery.

Crucially, the system operates under a strict **Deterministic Finite State Machine (FSM)** and a **Policy Gatekeeper**. This architecture mathematically bounds the AI, preventing prompt injection attacks, unauthorized discounts, and illegal state transitions, ensuring secure financial operations.

---

## 🌟 Core Engineering Features

### 1. 🛡️ Deterministic Policy Gatekeeper
LLMs are non-deterministic and cannot be implicitly trusted with financial decisions. RECOVER-AI intercepts all AI recommendations and routes them through a pure-function Policy Gatekeeper before execution.
- **Rules Enforced**: 
  - Prevents automated actions on already `PAID` cases.
  - Blocks communications with opted-out customers.
  - Enforces a hard limit of **3 maximum API retries**.
  - Enforces discount bounds (no negative discounts, bounded to `MAX_DISCOUNT_PERCENT`).
  - Blocks actions if AI confidence is below `0.70`.
- **Security**: The gatekeeper is deterministic and cannot be bypassed by prompt injections or LLM hallucinations.

### 2. 🚦 11-State Finite State Machine (FSM)
The entire recovery lifecycle is governed by an explicitly mapped FSM to prevent race conditions and illegal operations.
- **States**: `FAILED`, `DIAGNOSING`, `DIAGNOSED`, `ACTION_AUTHORIZED`, `AWAITING_PAYMENT`, `P2P_PAUSED`, `PAID`, `HALTED`, `ESCALATED`, `POLICY_BLOCKED`, `TERMINATED_OPT_OUT`.
- **Validation**: Transitions are mathematically validated (e.g., `FAILED` -> `DIAGNOSING` is valid, but `PAID` -> `FAILED` is strictly blocked).

### 3. 🔒 Cryptographic Idempotency
Double-charging a customer is a critical system failure. 
- **Implementation**: Unique idempotency keys (e.g., `${caseId}_pay_${retryCount}`) are generated for every financial action.
- **Enforcement**: Persisted in PostgreSQL with Prisma `@@unique` composite constraints.
- **Protection**: Ensures that concurrent webhook deliveries or duplicate execution requests gracefully fail the database constraint, preventing duplicate charges.

### 4. 🧠 AI Diagnosis & P2P Extraction
- **Model**: Powered by Google GenAI (`gemini-2.5-flash`), enforcing structured JSON output (`responseMimeType: "application/json"`).
- **Validation**: End-to-end type safety using **Zod** schemas (`DiagnosisOutputSchema`).
- **Prompt Injection Defense**: Inbound customer communications are sanitized against regex injection patterns (`bypass|override|ignore`). Detected attacks are safely classified as "UNKNOWN" intent.
- **Fallback**: Includes a local `MockAIProvider` for safe offline development and fallback. Retries transient API errors (HTTP 429/500+) with exponential backoff.

### 5. ⚡ Asynchronous Processing (BullMQ & Redis)
- Heavy workflows (AI diagnosis, email dispatch) are offloaded to a Redis-backed **BullMQ** queue.
- A dedicated background worker (`recovery.worker.ts`) processes `recovery-jobs` asynchronously, ensuring the main Express API remains highly available. *(Note: The live UI demo currently executes synchronously for immediate visual feedback).*

### 6. 📊 Observability & Hash Chaining
- **Logging**: Implemented with **Winston**. A custom formatter automatically redacts PII (emails, phone numbers, API keys).
- **Audit Trails**: Every FSM transition and action generates an immutable `AuditEvent`. Records are cryptographically chained using SHA-256 (`previousHash` -> `currentHash`).
- **Tracing**: `x-correlation-id` headers are tracked across the API and logged for distributed tracing.

---

## 💻 Technology Stack

### **Frontend**
- React 18, Vite, Tailwind CSS, Recharts, Lucide React.
- **Deployment**: Vercel.

### **Backend**
- Node.js (v20), Express.js, 100% Strict TypeScript.
- **Database**: PostgreSQL with Prisma ORM.
- **Cache/Queue**: Redis & BullMQ.
- **AI**: Google Gemini API (`@google/genai`).
- **Validation & Logging**: Zod, Winston.
- **Deployment**: Render.

---

## 🧪 Testing & Simulation Metrics

### Unit & Integration Testing
The repository includes a robust Vitest test suite focusing heavily on security, policy boundaries, and FSM integrity.
- **Total Tests**: 42 passing tests across 7 test files.
- **Coverage**: Includes Prompt Injection defense, FSM transitions, Policy Gatekeeper rule evaluations, Idempotency constraints, BigInt serialization, and Rate Limiting.

### Batch Simulation Evaluation (A/B Testing AI)
RECOVER-AI includes a deterministic, multi-seed batch simulator to mathematically evaluate the ROI of the AI compared to traditional "blind-retry" logic.
- **Scale**: Evaluated on **500 synthetic cases** per seed.
- **Accuracy**: Achieved **~85% diagnostic accuracy** against ground-truth datasets.
- **Recovery Lift**: Demonstrated a **~21% average relative recovery lift** in counterfactual simulations.
- **Integrity**: Strict isolation ensures the Treatment AI receives zero ground-truth parameters during simulation.

---

## 🌐 Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vivaangarg2005/AI-Revenue-Recovery.git
   cd AI-Revenue-Recovery
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Setup**:
   Copy `.env.example` to `.env` and fill in your PostgreSQL URL, Redis URL, and `GEMINI_API_KEY`.
4. **Database Setup**:
   ```bash
   npm run db:generate
   npm run db:push
   ```
5. **Start Services**:
   ```bash
   npm run dev
   ```
   *(This launches the React frontend and Express backend concurrently).*

---

## 🚀 Deployment Status

- **Frontend**: Deployed and publicly accessible on **Vercel** (`vercel.json` configured for API proxy rewrites).
- **Backend**: Deployed and publicly accessible on **Render** (Node.js API, PostgreSQL DB, and Redis instances).
- **Infrastructure-as-Code**: AWS CDK configuration (`aws-infra/`) is fully implemented for deployment to ECS Fargate and ALB, but is currently offline/not deployed.
