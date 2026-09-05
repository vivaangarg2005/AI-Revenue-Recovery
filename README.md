# RECOVER-AI

> **Track 03 — AI Revenue Recovery**  
> **Razorpay AI Buildathon 2026**

**RECOVER-AI is an autonomous, policy-bounded AI subscription revenue recovery engine designed to recover failed recurring subscription payments.**

Instead of treating every failed payment as the same retry problem, RECOVER-AI analyzes payment failures and customer intent, applies deterministic financial policies, executes only authorized recovery actions, and records the recovery workflow for auditability.

> [!IMPORTANT]
>
> ### Evaluation Disclaimer
>
> **All performance metrics reported in this README come from synthetic, reproducible simulations — not production payment data.**
>
> Across four deterministic 500-case paired experiments, RECOVER-AI achieved a **mean recovery lift of +20.98%** over the static retry baseline.
>
> The submitted demo uses `MockPaymentProvider`. No real-money payment is executed.

## 1. The Problem

Failed recurring payments do not always mean that a customer is lost.

A payment can fail because of insufficient funds, temporary failures, expired payment methods, authentication failures, permanent failures, or other payment-specific issues.

A traditional dunning workflow often looks like:

```text
Payment Failed → Retry → Retry Again → Stop
```

The same retry strategy is not appropriate for every failure. RECOVER-AI is designed to make these recovery decisions more intelligently while keeping financial actions under deterministic application control.

## 2. Our Approach

RECOVER-AI combines AI reasoning with deterministic policy enforcement.

```text
Payment Failure / Customer Message
              ↓
       AI Reasoning Layer
              ↓
        Zod Validation
              ↓
     Policy Gatekeeper
              ↓
       FSM / State Flow
              ↓
       Execution Engine
              ↓
         Audit Trail
```

The AI can recommend `SCHEDULED_RETRY`, `PAYMENT_LINK`, `MANDATE_UPDATE`, `DISCOUNT_NUDGE`, or `HUMAN_ESCALATION`.

The system also supports Promise-to-Pay extraction from customer messages.

> **AI can recommend. Policy authorizes. Code executes.**

The AI model does not have direct financial execution authority.

## 3. Core Architecture

```text
Payment Failure / P2P Message
            ↓
       AI Reasoning
            ↓
      Zod Validation
            ↓
     Policy Gatekeeper
            ↓
        FSM / State
            ↓
    Execution Engine
            ↓
        Audit Trail
```

The AI cannot execute transactions, change retry limits, bypass policy rules, grant unauthorized discounts, or override customer opt-outs.

Every proposed action must pass through the deterministic Policy Gatekeeper.

## 4. AI Provider Architecture

RECOVER-AI defines an `AIProvider` interface with:

```text
diagnosePaymentFailure()
extractPromiseToPay()
```

The configured provider is selected using `AI_MODE`.

### GeminiAIProvider

Uses `@google/genai` with `gemini-2.5-flash` and structured JSON output.

### OpenAIProvider

The repository also contains an OpenAI integration using `gpt-4o-mini` through direct HTTP requests.

### MockAIProvider

A deterministic provider used for automated testing, synthetic simulations, offline execution, and the buildathon demo.

## 5. AI Output Validation

AI outputs are validated using Zod schemas.

### Failure Categories

```text
TEMPORARY_FAILURE
INSUFFICIENT_FUNDS
AUTHENTICATION_FAILURE
EXPIRED_PAYMENT_METHOD
PERMANENT_FAILURE
UNKNOWN
```

### Recommended Strategies

```text
SCHEDULED_RETRY
PAYMENT_LINK
MANDATE_UPDATE
DISCOUNT_NUDGE
HUMAN_ESCALATION
```

### Promise-to-Pay Intents

```text
WILL_PAY
REQUEST_DELAY
REFUSES_PAYMENT
UNKNOWN
```

Confidence values are constrained between `0.0` and `1.0`.

## 6. Customer Context & Promise-to-Pay

RECOVER-AI supports customer-aware recovery through available customer context.

The Promise-to-Pay workflow can consider the current customer message, previous Promise-to-Pay commitments, broken Promise-to-Pay history, and customer-specific context.

Example:

> "I'll pay this Friday after salary."

Can produce:

```text
Intent: WILL_PAY
Promised Date: 2026-09-05
Confidence: 95%
```

If the customer has a history of broken promises, that historical context can be passed into the P2P AI reasoning path to make the model more cautious.

A valid Promise-to-Pay commitment moves the case to `P2P_PAUSED`.

### Important Accounting Rule

A Promise-to-Pay commitment is **not counted as recovered revenue**. Revenue recovery is recorded only after successful payment execution.

## 7. Deterministic Policy Gatekeeper

The Policy Engine is implemented as a pure deterministic function: `evaluatePolicy()`.

| Guardrail             |                            Value | Behaviour                                    |
| --------------------- | -------------------------------: | -------------------------------------------- |
| Policy ID             |         `POL_FINTECH_RECOVER_V1` | Recorded in decision audit data              |
| Maximum retries       |                              `3` | Further retries are denied                   |
| Maximum discount      |                           `5.0%` | Higher discounts are blocked                 |
| Minimum AI confidence |                            `70%` | Low-confidence recommendations are escalated |
| Customer opt-out      |                       Hard block | Automated communication/retries denied       |
| Valid action states   | `DIAGNOSED`, `ACTION_AUTHORIZED` | Invalid execution states are rejected        |

Example: an AI recommendation for a 20% discount is blocked when policy allows a maximum of 5%.

## 8. Low-Confidence Handling

When model-reported confidence is below `0.70`, the workflow can move to `ESCALATED`. This creates a deterministic boundary between automated decision-making and human review.

## 9. Prompt Injection & Red-Team Defense

RECOVER-AI includes defenses against adversarial customer messages and unsafe AI recommendations.

Inbound customer messages are inspected for prompt-injection patterns such as `ignore`, `system prompt`, `previous instructions`, `bypass`, `override`, `administrator`, and `pay me instead`.

Potential prompt-injection messages are treated as untrusted input. Customer text is explicitly framed as `UNTRUSTED USER DATA` and serialized before being inserted into the AI prompt.

Even if an adversarial prompt causes an unsafe recommendation, the deterministic policy layer independently validates it.

```text
"Give me a 99% discount"
          ↓
    AI Recommendation
          ↓
      Policy Gate
          ↓
    POLICY_BLOCKED
```

## 10. Recovery State Machine

RECOVER-AI uses an explicit finite state machine.

### Current States

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

Typical flow:

```text
FAILED → DIAGNOSING → DIAGNOSED → ACTION_AUTHORIZED → AWAITING_PAYMENT → PAID
```

Other outcomes include `P2P_PAUSED`, `POLICY_BLOCKED`, `ESCALATED`, `HALTED`, and `TERMINATED_OPT_OUT`.

Transitions are explicitly validated through `canTransition(from, to)`.

## 11. Payment Provider & Execution

RECOVER-AI uses a `PaymentProvider` abstraction.

The submitted build uses `MockPaymentProvider`. Real Razorpay network payment execution is **not implemented** in the current repository.

The mock provider marks execution as simulated, produces deterministic outcomes, supports idempotency, and prevents duplicate execution for the same idempotency key.

All demo payment actions are simulated.

## 12. Audit Trail

Important recovery events are stored in PostgreSQL through the `audit_events` table.

Events include event ID, case ID, event type, actor, payload, previous hash, current hash, correlation ID, and timestamp.

Actors can include `SYSTEM`, `LLM_AGENT`, `POLICY_ENGINE`, and `HUMAN`.

The event hash uses SHA-256.

> **Technical note:** The current implementation is an application-level SHA-256 hash-linked event log. It is not a blockchain or database-level immutable ledger.

## 13. Synthetic Simulation

RECOVER-AI includes a 500-case counterfactual simulation engine.

Each run contains:

```text
500 total cases
├── 250 Control
└── 250 Treatment
```

The two cohorts use paired underlying scenarios. The simulator uses a deterministic Linear Congruential Generator (LCG) with fixed seeds.

Example payment amounts include ₹299, ₹499, ₹999, ₹1,499, ₹2,499, ₹4,999, and ₹9,999.

The simulation is synthetic, local, deterministic, reproducible, zero-cost, and non-production.

## 14. Multi-Seed Evaluation

| Seed         |  Control Net (₹) | RECOVER-AI Net (₹) | Incremental (₹) | Recovery Lift | AI Accuracy | Escalations | Unneeded Interventions |
| ------------ | ---------------: | -----------------: | --------------: | ------------: | ----------: | ----------: | ---------------------: |
| **20260822** |        ₹1,96,826 |          ₹2,10,016 |        +₹13,190 |    **+6.70%** |       87.6% |          89 |                   0.0% |
| **20260823** |        ₹2,59,420 |          ₹3,02,104 |        +₹42,684 |   **+16.45%** |       84.8% |         104 |                   0.0% |
| **20260824** |        ₹1,90,535 |          ₹2,61,105 |        +₹70,570 |   **+37.03%** |       83.6% |          92 |                   0.0% |
| **20260825** |        ₹2,28,117 |          ₹2,82,298 |        +₹54,181 |   **+23.75%** |       83.6% |         100 |                   0.0% |
| **Mean**     | **₹2,18,724.50** |   **₹2,63,880.75** | **+₹45,156.25** |   **+20.98%** |   **84.9%** |   **96.25** |               **0.0%** |

### Metric Definitions

**Control Net** = Sum of recovered Paise in the control cohort / 100.

**RECOVER-AI Net** = Sum of `(recovered Paise - discount cost Paise)` in the treatment cohort / 100.

**Incremental** = RECOVER-AI Net - Control Net.

**Recovery Lift** = `((RECOVER-AI Net - Control Net) / Control Net) × 100`.

**AI Diagnosis Accuracy** = Correct AI category predictions / total treatment cases × 100.

**Unneeded Intervention Rate** = Retries attempted on unrecoverable cases / total treatment cases × 100.

The simulator is reproducible when the same seed is used.

## 15. Ground-Truth Isolation

Treatment diagnosis and action selection use observed fields such as:

```text
failureCode
failureMessage
amountPaise
customerTier
inboundP2PMessage
```

Synthetic ground-truth fields such as `canRecover` and `actualFailureCategory` are not exposed to the AI or policy decision path.

This prevents the simulator from directly giving the treatment strategy the answer it is supposed to predict.

## 16. Experiment Lab

The frontend provides an Experiment Lab with:

- **500-Case Evaluation** — runs and displays the synthetic benchmark.
- **Multi-Seed Robustness** — compares results across multiple deterministic seeds.
- **Counterfactual Paired Cases** — inspects the same underlying scenario under Control (Static Retry) versus Treatment (RECOVER-AI).

## 17. Dashboard

The Command Center provides:

- Revenue recovered
- Recovery lift
- Revenue at risk
- Policy blocks
- Control vs treatment comparison
- Recovery funnel
- Policy guardrails
- Recovery cases
- Case details
- Demo case generation

The recovery funnel represents:

```text
Revenue at Risk
      ↓
Payment Diagnosed
      ↓
Recovery Decision
      ↓
Authorized / Blocked / Escalated
      ↓
Recovered / Not Recovered
```

## 18. AI & Policy Lab

The AI & Policy Lab demonstrates the two key decision layers separately.

### AI Diagnosis Demo

- Payment failure diagnosis
- Confidence
- Recommended recovery strategy
- Structured AI output

### Policy Gate Demo

- Policy evaluation
- Authorized actions
- Blocked actions
- Financial guardrails

## 19. Technology Stack

### Monorepo

- npm Workspaces 10.x
- `apps/api`
- `apps/web`
- `packages/shared`

### Backend

- Node.js
- Express `4.19.2`
- TypeScript `5.4.5`
- Prisma `5.14.0`
- PostgreSQL
- Redis / ioredis `5.4.1`

### Frontend

- React `18.3.1`
- Vite `5.2.10`
- TailwindCSS `3.4.3`
- Lucide React `0.378.0`
- Recharts `2.12.7`

### AI

- `@google/genai` `2.18.0`
- Gemini `2.5 Flash`
- OpenAI `gpt-4o-mini`
- MockAIProvider

### Validation & Testing

- Zod `3.23.8`
- Vitest `1.6.0`
- tsx `4.9.3`

## 20. Repository Structure

```text
RECOVER-AI/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   ├── src/
│   │   │   └── domain/
│   │   │       ├── ai/
│   │   │       ├── policy/
│   │   │       ├── fsm/
│   │   │       ├── recovery/
│   │   │       ├── payment/
│   │   │       └── simulation/
│   │   └── tests/
│   └── web/
│       └── src/
│           └── components/
├── packages/
│   └── shared/
├── scripts/
│   └── runSimulation.ts
├── docs/
├── package.json
└── tsconfig.json
```

## 21. Available Commands

```bash
npm run dev
npm run build
npm run test
npm run test:watch
npm run lint
npm run format
npm run db:format
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:seed
npm run simulation:run
```

## 22. Verification

### Build

```bash
npm run build
```

**Status: PASS** — 0 TypeScript errors and 0 Vite build errors.

### Tests

```bash
npx vitest run
```

**Status: PASS**

```text
9 / 9 test files passed
86 / 86 tests passed
```

Coverage includes BigInt safety, AI validation, Promise-to-Pay parsing, FSM transitions, policy boundaries, prompt-injection defense, counterfactual simulation mechanics, environment validation, health checks, and the end-to-end recovery workflow.

## 23. Red-Team Test Coverage

The test suite covers:

- Prompt injection
- Unsafe discount recommendations
- Retry-limit violations
- Policy bypass attempts
- Low-confidence recommendations
- Ground-truth isolation
- Recovery workflow boundaries

> **AI output must never be sufficient on its own to authorize a financial action.**

## 24. Known Limitations

### Mock Payment Execution

Real Razorpay network payment execution is not implemented. The current demo uses `MockPaymentProvider` with simulated outcomes.

### Audit Hash Chaining

The current audit implementation provides application-level SHA-256 event hashing, but does not yet maintain a true previous-record hash chain.

### Database Fallback

When PostgreSQL is unavailable, API routes can fall back to an in-memory JavaScript `Map`.

### Diagnostic Payment History

The payment diagnosis input schema supports `paymentHistory`, but the main `RecoveryService` workflow currently does not pass historical payment failure records into the diagnostic AI prompt. Customer historical context is currently used in the Promise-to-Pay route where applicable.

### Async Workers

Redis/BullMQ-related schemas exist, but active async worker processes are not currently running. Recovery workflows execute synchronously.

## 25. Design Principles

### AI is Advisory

AI provides diagnosis, reasoning, and recommendations.

### Policy is Deterministic

Financial limits are enforced in application code.

### Execution is Bounded

Only authorized actions reach the payment provider.

### Customer Context Matters

Where available, customer history and behaviour can influence the recovery decision, particularly in the Promise-to-Pay workflow.

### Recovery is Measurable

The system compares RECOVER-AI against a static retry baseline using reproducible synthetic experiments.

### Recovery is Auditable

Important decisions and actions are recorded in an application-level audit log.

## 26. Why RECOVER-AI?

Traditional dunning systems often ask:

> **"Should we retry the payment?"**

RECOVER-AI asks:

> **"Why did the payment fail, what does the available customer context tell us, what recovery action makes sense, and is that action actually authorized?"**

The system combines:

```text
AI Reasoning
      +
Customer Context
      +
Deterministic Policy
      +
Bounded Execution
      +
Measurable Evaluation
      +
Auditability
```

into one recovery workflow.

## 27. Buildathon Alignment

Built for **Razorpay AI Buildathon 2026 — Track 03: AI Revenue Recovery**.

The project directly targets the track objective of detecting revenue at risk, determining the right intervention, and executing a bounded recovery workflow.

RECOVER-AI demonstrates:

- Revenue-at-risk detection
- AI-powered failure diagnosis
- Customer intent understanding
- Promise-to-Pay handling
- Customer-context-aware decisions
- Deterministic financial guardrails
- Bounded recovery execution
- Recovery measurement
- Counterfactual evaluation
- Red-team testing
- Auditability

All payment execution shown in the submitted demo is simulated.

## 28. Key Takeaway

```text
AI can recommend.
        ↓
Policy authorizes.
        ↓
Code executes.
        ↓
Audit records.
```

**RECOVER-AI turns payment recovery from blind retries into an intelligent, measurable, customer-aware, and policy-controlled workflow.**

---

Built for the **Razorpay AI Buildathon 2026 — Track 03: AI Revenue Recovery**.

All monetary values in the application are represented using integer Paise where applicable.

**1 INR = 100 Paise.**
