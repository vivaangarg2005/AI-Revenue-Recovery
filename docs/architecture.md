# RECOVER-AI System Architecture Specification

## 1. System Overview

RECOVER-AI is an enterprise-grade, policy-bounded AI dunning engine that diagnoses failed Razorpay subscription payments, integrates customer Promise-to-Pay commitments into state-machine timers, executes bounded recovery workflows via Razorpay Test-Mode APIs, halts on explicit compliance rules, and measures net revenue recovered.

```text
  Customer Payment Failure Event
               │
               ▼
   [ AI Diagnosis Service ] ──► Structured Failure Diagnosis (Zod Validated)
               │
               ▼
 [ Policy Gatekeeper Engine ] ──► Hard Compliance & Boundary Checks
               │
               ▼
  [ Domain Core FSM Engine ] ──► Deterministic State Transition Matrix
               │
               ▼
 [ Recovery Action Executor ] ──► Mock / Razorpay Test API Execution
               │
               ▼
  [ Append-Only Audit Trail ] ──► Cryptographically Verified Event Ledger
```

---

## 2. Core Architectural Invariant

```text
AI REASONING != POLICY AUTHORIZATION != PAYMENT EXECUTION
```

1. **AI REASONING (Non-Authoritative):** LLM analyzes failure codes, error messages, and customer replies to recommend recovery actions. The LLM cannot authorize financial transactions or alter FSM states directly.
2. **POLICY AUTHORIZATION (Authoritative Gatekeeper):** Pure, deterministic TypeScript module `evaluatePolicy()` evaluates recommendations against hard safety bounds.
3. **PAYMENT EXECUTION (Bounded Execution):** `MockPaymentProvider` or Razorpay Node.js SDK executes authorized payment retries or payment link generation.
4. **AUDIT LEDGER:** Immutable PostgreSQL database record storing SHA-256 policy signatures and timestamps.

---

## 3. Finite State Machine (FSM) Matrix

| From State | Trigger Event | Target State | Condition |
| :--- | :--- | :--- | :--- |
| `FAILED` | `DIAGNOSE` | `DIAGNOSING` | Initial payment failure ingestion |
| `DIAGNOSING` | `DIAGNOSIS_COMPLETE` | `DIAGNOSED` | AI diagnosis validated by Zod |
| `DIAGNOSED` | `EVALUATE_POLICY` | `ACTION_AUTHORIZED` | Policy Gatekeeper authorizes action |
| `DIAGNOSED` | `POLICY_DENIED` | `POLICY_BLOCKED` | Policy Gatekeeper denies action |
| `ACTION_AUTHORIZED` | `EXECUTE_PAYMENT` | `PAID` | Payment retry succeeds |
| `ACTION_AUTHORIZED` | `EXECUTE_LINK` | `AWAITING_PAYMENT` | Payment link sent to customer |
| `AWAITING_PAYMENT` | `RECEIVE_P2P` | `P2P_PAUSED` | Customer commits to pay on future date |
| `ACTION_AUTHORIZED` | `ESCALATE` | `ESCALATED` | Human review required |
| `ACTION_AUTHORIZED` | `HALT` | `HALTED` | Retry limit or opt-out reached |

---

## 4. Policy Gatekeeper Hard Safety Rules

1. **MAX_RETRIES:** Maximum 3 automated payment retries per subscription invoice.
2. **MAX_DISCOUNT_PERCENT:** Maximum 5.0% discount nudge cap.
3. **MIN_AI_CONFIDENCE:** Minimum 0.70 confidence score threshold.
4. **OPT_OUT:** 100% compliance with customer communication opt-out flags.
5. **TERMINAL_PROTECTION:** No recovery actions permitted on cases in state `PAID`.

---

## 5. Monetary Data Representation

- All monetary values are represented as 64-bit integer **BIGINT Paise** ($1 \text{ INR} = 100 \text{ Paise}$).
- Floating-point calculations on currency amounts are strictly prohibited across backend models and databases.
