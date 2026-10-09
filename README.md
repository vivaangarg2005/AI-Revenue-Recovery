# 🚀 RECOVER-AI: Autonomous Subscription Revenue Recovery Engine

## 📖 Executive Summary

**RECOVER-AI** is an autonomous, policy-bounded AI subscription revenue recovery engine designed to address involuntary churn caused by failed recurring payments.

Instead of relying entirely on rigid recovery rules, RECOVER-AI uses Large Language Models (LLMs) to diagnose payment failure context and propose recovery actions such as payment retries, payment links, and Promise-to-Pay (P2P) workflows.

The system does **not** allow the LLM to directly execute financial actions. AI-generated decisions are passed through a deterministic **Policy Gatekeeper** and a **Finite State Machine (FSM)** before execution.

This architecture separates probabilistic AI reasoning from deterministic business rules, helping prevent invalid state transitions, unauthorized discounts, excessive retries, duplicate financial actions, and prompt-injection-driven policy violations.

---

## 🌟 Core Engineering Features

### 1. 🛡️ Deterministic Policy Gatekeeper

LLMs are non-deterministic and should not directly control financial actions. RECOVER-AI intercepts AI recommendations and evaluates them through a deterministic Policy Gatekeeper before execution.

**Rules enforced:**

- Prevents automated actions on already `PAID` cases.
- Blocks communication actions for opted-out customers.
- Enforces a hard limit of **3 payment retries**.
- Enforces discount bounds using `MAX_DISCOUNT_PERCENT`.
- Rejects negative discounts.
- Blocks actions when AI confidence is below `0.70`.
- Restricts recovery actions to valid FSM states.

The Gatekeeper is implemented as deterministic application logic, meaning LLM output cannot bypass the defined business rules.

---

### 2. 🚦 11-State Finite State Machine (FSM)

The recovery lifecycle is governed by an explicitly defined deterministic FSM to prevent invalid state transitions.

**States:**

```text
FAILED
DIAGNOSING
DIAGNOSED
ACTION_AUTHORIZED
AWAITING_PAYMENT
P2P_PAUSED
PAID
HALTED
ESCALATED
POLICY_BLOCKED
TERMINATED_OPT_OUT
```

Transitions are validated before state changes.

For example:

```text
FAILED → DIAGNOSING                 Valid
DIAGNOSED → ACTION_AUTHORIZED       Valid
ACTION_AUTHORIZED → AWAITING_PAYMENT Valid

FAILED → PAID                      Invalid
TERMINATED_OPT_OUT → AWAITING_PAYMENT Invalid
```

This keeps recovery workflows within explicitly defined business states.

---

### 3. 🔒 Database-Backed Idempotency

Duplicate financial actions are a critical failure mode in payment systems.

RECOVER-AI uses database-backed idempotency to ensure repeated or concurrent requests cannot create duplicate financial-action records.

**Implementation:**

- Unique idempotency keys are generated for financial actions.
- Keys are persisted with recovery actions and payment attempts.
- PostgreSQL/Prisma unique constraints enforce uniqueness at the database layer.
- Composite uniqueness constraints protect invoice/attempt combinations.

Example idempotency key patterns:

```text
{caseId}_act_{timestamp}
{caseId}_pay_{retryCount}
```

When duplicate or concurrent requests attempt to create the same protected record, PostgreSQL uniqueness constraints reject the duplicate operation.

---

### 4. 🧠 AI Diagnosis & P2P Extraction

RECOVER-AI uses Google Gemini for structured AI reasoning.

**Model:**

```text
gemini-2.5-flash
```

The system requests structured JSON responses and validates them before they enter the recovery workflow.

**Validation:**

- `DiagnosisOutputSchema`
- `P2PExtractionOutputSchema`
- Zod-based runtime validation
- Structured JSON output using Gemini's JSON response mode

### Prompt Injection Defense

Untrusted customer input is checked for suspicious instruction patterns such as:

```text
ignore
system prompt
previous instructions
bypass
override
```

Detected injection-like inputs are safely classified as `UNKNOWN` rather than being allowed to directly influence recovery policy.

### AI Failure Handling

Transient Gemini API failures are handled using bounded retries with exponential backoff for HTTP `429` and `500+` responses.

The system also includes a deterministic `MockAIProvider` for local development, testing, and non-production fallback scenarios.

---

## 5. ⚡ Asynchronous Processing with BullMQ & Redis

RECOVER-AI includes a Redis-backed BullMQ job-processing architecture for recovery workflows.

### Architecture

```text
Client
  ↓
Express API
  ↓
Recovery Job
  ↓
Redis / BullMQ
  ↓
Background Worker
  ↓
RecoveryService
  ↓
AI Diagnosis
  ↓
Policy Gatekeeper
  ↓
FSM
  ↓
Database
```

A dedicated worker processes recovery jobs independently from the API process.

The worker is configured with concurrency control and processes recovery jobs through the same `RecoveryService` workflow.

> **Demo note:** The currently deployed live UI executes the recovery workflow synchronously so that state changes can be displayed immediately in the demo. The BullMQ/Redis worker architecture remains implemented in the codebase.

---

## 6. 📊 Observability & Tamper-Evident Audit Trails

RECOVER-AI includes structured logging and audit tracking for recovery workflows.

### Logging

Implemented using **Winston** with:

- Request correlation IDs
- Structured log messages
- PII redaction for emails and phone numbers
- Sensitive-key redaction for values such as passwords, secrets, and API keys

### Audit Events

Important FSM transitions and recovery actions generate persisted `AuditEvent` records.

Audit records use SHA-256 hash chaining:

```text
Previous Event Hash
        ↓
Current Event Data
        ↓
Current Event Hash
```

This creates a **tamper-evident audit trail** for recovery events.

### Request Correlation

`x-correlation-id` values are attached to requests and propagated into application logs and database events, making it easier to correlate activity across a recovery workflow.

---

# 💻 Technology Stack

## Frontend

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React
- Vercel

## Backend

- Node.js 20
- Express.js
- TypeScript
- REST APIs

## Database

- PostgreSQL
- Prisma ORM

## Cache & Background Processing

- Redis
- BullMQ

## AI

- Google Gemini API
- `@google/genai`
- Gemini 2.5 Flash

## Validation & Observability

- Zod
- Winston
- Correlation IDs
- Structured logging

## Testing

- Vitest
- Unit testing
- Integration testing
- Red-team/security-oriented tests

## DevOps

- Docker
- Docker Compose
- GitHub Actions
- AWS CDK

---

# 🧪 Testing & Simulation

## Unit & Integration Testing

The repository includes a Vitest test suite focused on FSM integrity, policy boundaries, security behavior, AI handling, and API behavior.

### Current Test Suite

- **42 passing tests**
- **7 test files**
- 0 failed
- 0 skipped

### Tested Areas

- FSM transition validation
- Policy Gatekeeper rules
- Prompt-injection handling
- Idempotency behavior
- AI fallback and retry behavior
- Rate limiting
- Health checks
- BigInt serialization
- Recovery workflow behavior

---

## 📈 Counterfactual Simulation

RECOVER-AI includes a deterministic batch simulator to evaluate AI-driven recovery decisions against a baseline recovery strategy.

### Simulation Design

```text
Control Group
     ↓
Baseline Recovery Strategy

Treatment Group
     ↓
AI-Assisted Recovery Strategy
```

### Scale

- **500 synthetic cases per seed**
- Multiple deterministic seeds
- No ground-truth parameters exposed to the treatment AI during decision-making

### Results

- **~85% diagnostic accuracy**
- **~21% average relative recovery lift** across multiple seeds
- Deterministic results for a given seed

The recovery metric accounts for both recovered revenue and discount costs.

```text
Net Recovery
=
Gross Recovered Revenue
-
Discount Given
```

The reported ~21% figure represents **simulated counterfactual recovery lift**, not an increase in real-world business revenue.

### Ground-Truth Isolation

The simulator intentionally prevents the treatment AI from receiving final recoverability ground-truth parameters.

This avoids leaking the expected outcome into the AI's decision-making process and keeps the comparison meaningful.

---

# 🏗️ Architecture Overview

```text
                    ┌──────────────────┐
                    │   React / Vite   │
                    │    Dashboard     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Express REST    │
                    │       API        │
                    └────────┬─────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
        ┌─────────────────┐      ┌─────────────────┐
        │ PostgreSQL      │      │ Redis / BullMQ  │
        │ + Prisma        │      │ Job Queue       │
        └─────────────────┘      └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │ Recovery Worker │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │ RecoveryService │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │ Gemini 2.5      │
                                 │ Flash           │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │ Policy          │
                                 │ Gatekeeper      │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │ 11-State FSM    │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │ Financial       │
                                 │ Action          │
                                 └─────────────────┘
```

The core design principle is:

> **LLM proposes. Deterministic application logic decides.**

---

# 🔐 Security Controls

RECOVER-AI includes several application-level security controls:

### Prompt Injection Defense

Suspicious instruction patterns in untrusted input are detected before AI interpretation.

### Rate Limiting

API endpoints use IP-based rate limiting:

```text
100 requests / 15 minutes / IP
```

### Input Validation

AI responses are validated using Zod schemas before entering business logic.

### Policy Enforcement

AI-generated actions cannot bypass deterministic business rules.

### Idempotency

Database uniqueness constraints protect against duplicate financial-action records.

### PII Redaction

Application logs redact sensitive values including:

- Email addresses
- Phone numbers
- Passwords
- API keys
- Secrets

> Rate limiting is an application-level control and is not intended to replace DDoS protection or a WAF.

---

# 🐳 Running Locally

## 1. Clone the repository

```bash
git clone https://github.com/vivaangarg2005/AI-Revenue-Recovery.git
cd AI-Revenue-Recovery
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Configure the required values including:

```text
DATABASE_URL
REDIS_URL
GEMINI_API_KEY
```

## 4. Generate Prisma Client

```bash
npm run db:generate
```

## 5. Push the database schema

```bash
npm run db:push
```

## 6. Start development services

```bash
npm run dev
```

The development setup launches the frontend and backend concurrently.

---

# 🐳 Docker

The repository includes Docker support for local development.

### Build and start services

```bash
docker-compose up -d --build
```

This provides the application environment with the required PostgreSQL and Redis services.

---

# 🚀 Deployment Status

## Frontend

**Vercel**

The React frontend is publicly deployed on Vercel.

```text
https://ai-revenue-recovery-nine-roan.vercel.app/
```

Vercel configuration includes API proxy/rewrite configuration.

## Backend

**Render**

The backend is publicly deployed on Render with PostgreSQL and Redis infrastructure.

## AWS Infrastructure

AWS CDK infrastructure is implemented under:

```text
aws-infra/
```

The infrastructure configuration includes resources for an AWS deployment architecture involving:

- VPC
- Subnets
- NAT
- ECS Fargate
- Application Load Balancer

**Important:** The AWS CDK infrastructure is implemented but **has not been deployed to AWS**.

---

# 📁 Repository Structure

```text
AI-Revenue-Recovery/
│
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── domain/
│   │       ├── infrastructure/
│   │       ├── services/
│   │       ├── routes/
│   │       └── ...
│   │
│   └── web/
│       └── src/
│
├── aws-infra/
│
├── prisma/
│
├── scripts/
│   └── runSimulation.ts
│
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

---

# 🎯 Engineering Principles

RECOVER-AI is built around a few core principles:

### AI for reasoning, deterministic code for control

The LLM can recommend an action, but deterministic application logic decides whether that action is allowed.

### Database constraints for financial safety

Important uniqueness and consistency guarantees are enforced at the PostgreSQL layer rather than relying only on application checks.

### Explicit state over implicit workflow

The 11-state FSM makes recovery lifecycle transitions explicit and testable.

### Simulation before assumptions

The counterfactual simulator provides a deterministic environment for evaluating AI-assisted recovery strategies against a baseline.

### Security at system boundaries

Untrusted inputs are validated and sanitized before they can influence sensitive recovery workflows.

---

# 📊 Project Highlights

| Capability | Implementation |
|---|---|
| AI Diagnosis | Gemini 2.5 Flash |
| AI Output Validation | Zod |
| Workflow Control | 11-state deterministic FSM |
| Policy Enforcement | Deterministic Policy Gatekeeper |
| Idempotency | PostgreSQL + Prisma unique constraints |
| Background Processing | BullMQ + Redis |
| Worker | Dedicated recovery worker |
| Rate Limiting | 100 requests / 15 min / IP |
| Logging | Winston |
| Audit Trail | SHA-256 hash chaining |
| Testing | 42 passing Vitest tests |
| Simulation | 500 synthetic cases per seed |
| Simulated Recovery Lift | ~21% average relative lift |
| Diagnostic Accuracy | ~85% |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |
| Containerization | Docker / Docker Compose |
| Infrastructure as Code | AWS CDK |

---

# ⚠️ Current Limitations

RECOVER-AI is a development and simulation project and should not be interpreted as a production payment-recovery platform.

Current limitations include:

- Simulation results are based on synthetic data.
- No real customer payment traffic is processed.
- AWS CDK infrastructure is implemented but not deployed.
- The deployed demo executes recovery synchronously for immediate UI feedback.
- Application-level rate limiting is implemented; enterprise DDoS/WAF protection is outside the project scope.
- The AI evaluation is based on deterministic simulations rather than live production experiments.

---

# 👨‍💻 Author

**Vivaan Garg**

- GitHub: https://github.com/vivaangarg2005
- LinkedIn: https://linkedin.com/in/vivaangarg2005
- Portfolio: https://vivaangarg.netlify.app
