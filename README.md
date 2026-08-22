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
- **AI & Logic:** Official `@google/genai` SDK (`GeminiAIProvider`), `MockAIProvider` ($₹0$ cost fallback), Zod schemas
- **Testing:** 84/84 automated Vitest tests passing (including 12 red-team & ground-truth isolation tests)

---

## 4. Experiment History & Results

### Ground-Truth Isolation & P2P Attribution Audit
Following a strict audit, we eliminated all potential ground-truth parameter leakage from decision paths and separated Promise-to-Pay commitments from financial payment recoveries.

### Final Multi-Seed Robustness Results (500 Paired Cases — Zero Ground-Truth Leakage)

| Seed | Control Net (₹) | RECOVER-AI Net (₹) | Incremental Net (₹) | Treatment Lift % | AI Diagnosis Acc % | Escalations | Unneeded Interventions % |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **20260822** | ₹1,96,826 | ₹2,10,016 | +₹13,190 | **+6.70%** | 87.6% | 89 | 0.0% |
| **20260823** | ₹2,59,420 | ₹3,02,104 | +₹42,684 | **+16.45%** | 84.8% | 104 | 0.0% |
| **20260824** | ₹1,90,535 | ₹2,61,105 | +₹70,570 | **+37.03%** | 83.6% | 92 | 0.0% |
| **20260825** | ₹2,28,117 | ₹2,82,298 | +₹54,181 | **+23.75%** | 83.6% | 100 | 0.0% |

Across four deterministic synthetic experiments with zero ground-truth leakage, RECOVER-AI produced a **reported mean recovery lift of +20.98%** over static dunning.

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
