# RECOVER-AI

> **Track 03 — AI Revenue Recovery**  
> *Razorpay AI Buildathon Submission*

---

> [!IMPORTANT]
> **MANDATORY STATISTICAL DISCLAIMER:**  
> **Synthetic simulation — not production payment data.**  
> *Across four deterministic synthetic experiments, RECOVER-AI produced a reported mean recovery lift of +69.00% over the baseline (ranging from +51.62% to +79.64%). All metrics reflect a 500-case reproducible synthetic batch running locally in Mock Mode at $₹0$ operating cost.*

---

## 1. Project Overview & Problem Statement

Revenue loss for subscription businesses rarely happens in one clean step:
1. Bank gateway timeouts cause temporary payment degradation.
2. Expired credit cards and 3DS authentication failures block automated mandate execution.
3. Insufficient bank balances cause recurring payment retries to fail.
4. Traditional dunning tools rely on blind, static retries—annoying customers while failing to recover complex payment degradation.

**RECOVER-AI** is a buildathon-ready, policy-bounded AI subscription revenue recovery engine designed for Razorpay merchant ecosystems. It closes the loop from diagnosing failed subscription payments to selecting compliant interventions, ingesting customer Promise-to-Pay commitments, executing mock-mode payment workflows, and maintaining an auditable security log.

---

## 2. Core Architectural Invariant

```text
Payment Failure ──► AI Diagnosis ──► Zod Validation ──► Policy Gatekeeper ──► FSM ──► PaymentProvider ──► Audit Ledger
```

- **AI Reasoning:** LLM proposes root cause diagnosis and recommended strategies. It possesses **zero financial execution authority**.
- **Zod Validation:** Enforces strict runtime JSON schema validation.
- **Policy Gatekeeper:** Zero-dependency TypeScript module enforcing hard merchant bounds ($5.0\%$ max discount, $3$ max retries, customer opt-outs, min $0.70$ AI confidence).
- **FSM State Engine:** Controls valid state transitions (`FAILED` $\rightarrow$ `DIAGNOSING` $\rightarrow$ `DIAGNOSED` $\rightarrow$ `ACTION_AUTHORIZED` $\rightarrow$ `PAID` / `P2P_PAUSED` / `POLICY_BLOCKED` / `ESCALATED` / `HALTED`).
- **PaymentProvider Abstraction:** Authorized actions are executed through the `PaymentProvider` abstraction; the submitted demo uses `MockPaymentProvider` for deterministic, zero-cost simulation cleanly labeled **`SIMULATED PAYMENT`**.
- **Audit Ledger:** Append-only cryptographic event log.

---

## 3. Technology Stack & Verification Status

- **Monorepo:** npm Workspaces (`apps/api`, `apps/web`, `packages/shared`)
- **Backend:** Node.js 20 LTS, TypeScript, Express, Prisma ORM, PostgreSQL 16
- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Lucide Icons
- **AI & Logic:** OpenAI SDK / `MockAIProvider` ($₹0$ cost), Zod schemas
- **Testing:** 84/84 automated Vitest tests passing (including 11 red-team security tests)

---

## 4. Experiment History & Results

### The Engineering Pivot Story
In our initial 500-case simulation run, RECOVER-AI produced a reported lift of **-6.2%** (Control: ₹1,90,231 vs RECOVER-AI: ₹1,78,436).

**Root Cause:** Treatment stopped after a single attempt, whereas Control had up to 3 retries across days. Additionally, RECOVER-AI escalated 143 cases prematurely.

**Fix Implemented:** We granted RECOVER-AI an equal 3-attempt budget, added adaptive failure-specific recovery strategies (e.g. payment links for expired cards), and corrected the unnecessary-intervention measurement metric.

### Final Multi-Seed Robustness Results (500 Paired Cases)

| Seed | Control Net (₹) | RECOVER-AI Net (₹) | Incremental Net (₹) | Treatment Lift % | AI Diagnosis Acc % | Escalations | Unneeded Interventions % |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **20260822** | ₹1,96,826 | ₹3,50,970 | +₹1,54,144 | **+78.31%** | 87.6% | 39 | 3.2% |
| **20260823** | ₹2,59,420 | ₹4,31,772 | +₹1,72,352 | **+66.43%** | 84.8% | 36 | 8.4% |
| **20260824** | ₹1,90,535 | ₹3,42,283 | +₹1,51,748 | **+79.64%** | 83.6% | 34 | 5.2% |
| **20260825** | ₹2,28,117 | ₹3,45,881 | +₹1,17,764 | **+51.62%** | 83.6% | 40 | 4.8% |

Across four deterministic synthetic experiments, RECOVER-AI produced a **reported mean recovery lift of +69.00%** over the baseline with a measured 3.2% unnecessary-intervention rate on seed 20260822.

---

## 5. Local Setup & Quickstart

Setup instructions documented and verified locally:

```bash
# 1. Clone & Install Dependencies
git clone https://github.com/vivaangarg2005/AI-Revenue-Recovery.git
cd AI-Revenue-Recovery
npm install

# 2. Configure Environment (Defaults to $0 Mock Mode)
cp .env.example .env

# 3. Database Migration & Prisma Generation
npm run db:generate
npm run db:migrate

# 4. Run Monorepo Build & Test Suites
npm test
npm run build

# 5. Run 500-Case Multi-Seed Simulation CLI
npm run simulation:run

# 6. Start Development Servers
npm run dev
```

---

## 6. License & Buildathon Notice

Built for **Razorpay AI Buildathon — Track 03 (AI Revenue Recovery)**.
All monetary amounts use 64-bit integer `BIGINT` Paise ($1 \text{ INR} = 100 \text{ Paise}$).
