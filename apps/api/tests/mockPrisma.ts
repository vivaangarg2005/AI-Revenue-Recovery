import { vi } from "vitest";

class InMemoryPrisma {
  customers = new Map<string, any>();
  subscriptions = new Map<string, any>();
  invoices = new Map<string, any>();
  recoveryCases = new Map<string, any>();
  failureEvents = new Map<string, any>();
  aiDiagnoses = new Map<string, any>();
  policyDecisions = new Map<string, any>();
  recoveryActions = new Map<string, any>();
  paymentAttempts = new Map<string, any>();
  p2pCommitments = new Map<string, any>();
  fsmTransitions: any[] = [];
  auditEvents: any[] = [];

  reset() {
    this.customers.clear();
    this.subscriptions.clear();
    this.invoices.clear();
    this.recoveryCases.clear();
    this.failureEvents.clear();
    this.aiDiagnoses.clear();
    this.policyDecisions.clear();
    this.recoveryActions.clear();
    this.paymentAttempts.clear();
    this.p2pCommitments.clear();
    this.fsmTransitions = [];
    this.auditEvents = [];
  }

  customer = {
    findFirst: async (args: any) => {
      for (const c of this.customers.values()) {
        if (args?.where?.id && c.id === args.where.id) return c;
        if (args?.where?.email && c.email === args.where.email) return c;
      }
      return null;
    },
    create: async (args: any) => {
      const id = args.data.id || `cust_${Date.now()}_${Math.random()}`;
      const item = { id, ...args.data };
      this.customers.set(id, item);
      return item;
    },
  };

  subscription = {
    findFirst: async () => Array.from(this.subscriptions.values())[0] || null,
    create: async (args: any) => {
      const id = `sub_${Date.now()}_${Math.random()}`;
      const item = { id, ...args.data };
      this.subscriptions.set(id, item);
      return item;
    },
  };

  invoice = {
    findFirst: async () => Array.from(this.invoices.values())[0] || null,
    create: async (args: any) => {
      const id = `inv_${Date.now()}_${Math.random()}`;
      const item = { id, ...args.data };
      this.invoices.set(id, item);
      return item;
    },
  };

  recoveryCase = {
    create: async (args: any) => {
      const id = `case_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const item = {
        id,
        retryCount: 0,
        amountDuePaise: BigInt(args.data.amountDuePaise || 99900),
        recoveredPaise: BigInt(0),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      this.recoveryCases.set(id, item);
      return item;
    },
    findUnique: async (args: any) => {
      const caseId = args.where.id;
      const c = this.recoveryCases.get(caseId);
      if (!c) return null;

      const subObj = this.subscriptions.get(c.subscriptionId) || { id: c.subscriptionId, customerId: "cust_1" };
      const customer = this.customers.get(subObj.customerId) ||
        Array.from(this.customers.values())[0] || {
          id: "cust_1",
          email: "demo@example.com",
          tier: "STANDARD",
          isOptedOut: false,
        };

      const subscription = {
        ...subObj,
        customer,
      };
      const invoice = this.invoices.get(c.invoiceId) || { id: c.invoiceId };

      const FailureEvent = Array.from(this.failureEvents.values()).filter((f) => f.caseId === caseId);
      const AIDiagnosis = Array.from(this.aiDiagnoses.values()).filter((d) => d.caseId === caseId);
      const PolicyDecision = Array.from(this.policyDecisions.values()).filter((p) => p.caseId === caseId);
      const RecoveryAction = Array.from(this.recoveryActions.values()).filter((a) => a.caseId === caseId);
      const PaymentAttempt = Array.from(this.paymentAttempts.values()).filter((pa) => pa.invoiceId === c.invoiceId);
      const P2PCommitment = Array.from(this.p2pCommitments.values()).filter((p2p) => p2p.caseId === caseId);
      const FSMTransition = this.fsmTransitions.filter((t) => t.caseId === caseId);
      const AuditEvent = this.auditEvents.filter((e) => e.caseId === caseId);

      return {
        ...c,
        subscription,
        invoice,
        FailureEvent,
        AIDiagnosis,
        PolicyDecision,
        RecoveryAction,
        PaymentAttempt,
        P2PCommitment,
        FSMTransition,
        AuditEvent,
      };
    },
    update: async (args: any) => {
      const caseId = args.where.id;
      const existing = this.recoveryCases.get(caseId);
      if (!existing) throw new Error("Not found");

      const updated = { ...existing, ...args.data, updatedAt: new Date() };
      this.recoveryCases.set(caseId, updated);
      return updated;
    },
  };

  failureEvent = {
    create: async (args: any) => {
      const id = `fevt_${Date.now()}_${Math.random()}`;
      const item = { id, occurredAt: new Date(), ...args.data };
      this.failureEvents.set(id, item);
      return item;
    },
  };

  aIDiagnosis = {
    create: async (args: any) => {
      const id = `diag_${Date.now()}_${Math.random()}`;
      const item = { id, createdAt: new Date(), ...args.data };
      this.aiDiagnoses.set(id, item);
      return item;
    },
  };

  policyDecision = {
    create: async (args: any) => {
      const id = `pol_${Date.now()}_${Math.random()}`;
      const item = { id, createdAt: new Date(), ...args.data };
      this.policyDecisions.set(id, item);
      return item;
    },
  };

  recoveryAction = {
    create: async (args: any) => {
      const id = `act_${Date.now()}_${Math.random()}`;
      const item = { id, createdAt: new Date(), updatedAt: new Date(), ...args.data };
      this.recoveryActions.set(id, item);
      return item;
    },
    update: async (args: any) => {
      const id = args.where.id;
      const existing = this.recoveryActions.get(id);
      const updated = { ...existing, ...args.data, updatedAt: new Date() };
      this.recoveryActions.set(id, updated);
      return updated;
    },
  };

  paymentAttempt = {
    create: async (args: any) => {
      const id = `pay_${Date.now()}_${Math.random()}`;
      const item = { id, createdAt: new Date(), ...args.data };
      this.paymentAttempts.set(id, item);
      return item;
    },
  };

  p2PCommitment = {
    create: async (args: any) => {
      const id = `p2p_${Date.now()}_${Math.random()}`;
      const item = { id, createdAt: new Date(), ...args.data };
      this.p2pCommitments.set(id, item);
      return item;
    },
  };

  fSMTransition = {
    create: async (args: any) => {
      const id = `trans_${Date.now()}_${Math.random()}`;
      const item = { id, timestamp: new Date(), ...args.data };
      this.fsmTransitions.push(item);
      return item;
    },
  };

  auditEvent = {
    create: async (args: any) => {
      const id = `evt_${Date.now()}_${Math.random()}`;
      const item = { id, timestamp: new Date(), ...args.data };
      this.auditEvents.push(item);
      return item;
    },
  };

  $transaction = async (fn: any) => fn(this);
}

export const mockPrismaInstance = new InMemoryPrisma();
