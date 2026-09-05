import { useState, useEffect } from "react";
import { TrendingUp, Cpu, Lock, PlusCircle } from "lucide-react";
import { CaseDetailModal } from "./CaseDetailModal";

export function CommandCenter() {
  const [metrics, setMetrics] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [demoCreating, setDemoCreating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [mRes, cRes] = await Promise.all([
        fetch("/api/v1/simulations/latest"),
        fetch("/api/v1/recovery-cases"),
      ]);
      const mData = await mRes.json();
      const cData = await cRes.json();
      setMetrics(mData);
      if (Array.isArray(cData)) setCases(cData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDemoCase = async () => {
    setDemoCreating(true);
    setErrorMsg(null);
    try {
      const demoScenarios = [
        {
          customerName: "Acme Corp (Enterprise)",
          customerEmail: "finance@acme.com",
          customerPhone: "+919876543210",
          customerTier: "ENTERPRISE",
          amountPaise: 499900, // ₹4,999
          failureCode: "EXPIRED_CARD",
          failureMessage:
            "Card expiry date has passed during subscription renewal",
          inboundP2PMessage:
            "We will pay this Friday after our billing cycle resets.",
        },
        {
          customerName: "Zomato Gold Partner",
          customerEmail: "billing@zomato-partner.in",
          customerPhone: "+919811122233",
          customerTier: "STANDARD",
          amountPaise: 99900, // ₹999
          failureCode: "GATEWAY_TIMEOUT",
          failureMessage:
            "HDFC bank payment gateway timed out during mandate debit",
          inboundP2PMessage:
            "Please retry in the evening, my account is active.",
        },
        {
          customerName: "Flipkart Seller Pro",
          customerEmail: "ops@flipkart-seller.com",
          customerPhone: "+919822233344",
          customerTier: "ENTERPRISE",
          amountPaise: 1499900, // ₹14,999
          failureCode: "INSUFFICIENT_FUNDS",
          failureMessage:
            "Insufficient funds in customer ICICI current account",
          inboundP2PMessage:
            "Salary payout is on 1st, please hold retries until then.",
        },
        {
          customerName: "Swiggy Super Merchant",
          customerEmail: "payments@swiggystore.com",
          customerPhone: "+919833344455",
          customerTier: "STANDARD",
          amountPaise: 249900, // ₹2,499
          failureCode: "3DS_AUTH_FAILED",
          failureMessage: "Customer failed two-factor 3DS OTP verification",
          inboundP2PMessage: "Send me a direct payment link on WhatsApp.",
        },
        {
          customerName: "CRED Club VIP Member",
          customerEmail: "vip@cred-member.co",
          customerPhone: "+919844455566",
          customerTier: "ENTERPRISE",
          amountPaise: 2999900, // ₹29,999
          failureCode: "EXPIRED_CARD",
          failureMessage: "Corporate credit card expired on 08/26",
          inboundP2PMessage:
            "Corporate card renewed, send me the new checkout link.",
        },
      ];

      const chosenScenario =
        demoScenarios[Math.floor(Math.random() * demoScenarios.length)];

      // 1. Create synthetic payment failure case
      const createRes = await fetch("/api/v1/recovery-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chosenScenario),
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(
          errData?.error?.message ||
            `Failed to create case (HTTP ${createRes.status})`,
        );
      }
      const newCase = await createRes.json();

      // 2. Run automated recovery workflow
      const runRes = await fetch(`/api/v1/recovery-cases/${newCase.id}/run`, {
        method: "POST",
      });
      if (!runRes.ok) {
        const errData = await runRes.json().catch(() => ({}));
        throw new Error(
          errData?.error?.message ||
            `Failed to run workflow (HTTP ${runRes.status})`,
        );
      }
      const updatedCase = await runRes.json();

      // 3. Update list & open case detail modal
      setCases((prev) => [updatedCase, ...prev]);
      setSelectedCase(updatedCase);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message ||
          "Failed to create recovery case. Ensure Database (PostgreSQL) is running.",
      );
    } finally {
      setDemoCreating(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    if (filter === "ALL") return true;
    if (filter === "PAID") return c.fsmState === "PAID";
    if (filter === "P2P_PAUSED") return c.fsmState === "P2P_PAUSED";
    if (filter === "POLICY_BLOCKED") return c.fsmState === "POLICY_BLOCKED";
    if (filter === "ESCALATED") return c.fsmState === "ESCALATED";
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Hero Section */}
      <div className="py-4 border-b border-slate-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Subscription Revenue Recovery
          </h1>
          <p className="text-slate-400 mt-1 max-w-2xl text-sm leading-relaxed">
            Recover failed recurring payments using AI-driven diagnosis,
            policy-bounded actions, and measurable counterfactual evaluation.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-slate-800/50 text-slate-300 border border-slate-700/50">
            Simulation: 500 cases
          </span>
          <span className="px-2.5 py-1 rounded-md bg-purple-900/20 text-purple-300 border border-purple-500/30">
            AI: Gemini
          </span>
          <span className="px-2.5 py-1 rounded-md bg-emerald-900/20 text-emerald-400 border border-emerald-500/30">
            Policy: Active
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-sm text-rose-200 flex items-center justify-between gap-2">
          <span>⚠️ {errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="px-3 py-1 rounded bg-rose-900 hover:bg-rose-800 text-white font-medium text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Business KPIs */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50"></div>
            <div className="text-sm font-medium text-slate-400 mb-2">
              REVENUE RECOVERED
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              ₹
              {(
                Number(metrics.treatmentNetRecoveredPaise || 0) / 100
              ).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-emerald-400 font-medium">
              +₹
              {(
                Number(metrics.incrementalRecoveredPaise || 0) / 100
              ).toLocaleString("en-IN", { maximumFractionDigits: 0 })}{" "}
              vs blind retries
            </div>
          </div>

          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
            <div className="text-sm font-medium text-slate-400 mb-2">
              RECOVERY LIFT
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              +{metrics.recoveryLiftPercent}%
            </div>
            <div className="text-sm text-indigo-400 font-medium">
              relative to control group
            </div>
          </div>

          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-600/50"></div>
            <div className="text-sm font-medium text-slate-400 mb-2">
              REVENUE AT RISK
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              ₹
              {(Number(metrics.totalRiskPaise || 0) / 100).toLocaleString(
                "en-IN",
                { maximumFractionDigits: 0 },
              )}
            </div>
            <div className="text-sm text-slate-500 font-medium">
              500 failed payments
            </div>
          </div>

          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/50"></div>
            <div className="text-sm font-medium text-slate-400 mb-2">
              POLICY BLOCKED
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {metrics.policyBlockCount}
            </div>
            <div className="text-sm text-rose-400 font-medium">
              unsafe actions prevented
            </div>
          </div>
        </div>
      )}

      {/* Main Visual Comparison & How It Decides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Net Recovery Comparison */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-2">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" /> BLIND RETRY vs
              RECOVER-AI
            </h3>
            {metrics && (
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">
                +{metrics.recoveryLiftPercent}% Lift
              </span>
            )}
          </div>

          {metrics ? (
            <div className="space-y-5 py-2">
              {/* Control Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-400">BLIND RETRY</span>
                  <span className="text-slate-300">
                    ₹
                    {(
                      Number(metrics.controlNetRecoveredPaise || 0) / 100
                    ).toLocaleString("en-IN")}{" "}
                    recovered{" "}
                    <span className="text-slate-500">
                      ({metrics.controlRecoveryRatePercent}%)
                    </span>
                  </span>
                </div>
                <div className="w-full h-4 bg-slate-900 rounded overflow-hidden">
                  <div
                    className="h-full bg-slate-600 transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(5, Number(metrics.controlRecoveryRatePercent || 0)))}%`,
                    }}
                  />
                </div>
              </div>

              {/* RECOVER-AI Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-emerald-400 font-bold">RECOVER-AI</span>
                  <span className="text-emerald-400 font-bold">
                    ₹
                    {(
                      Number(metrics.treatmentNetRecoveredPaise || 0) / 100
                    ).toLocaleString("en-IN")}{" "}
                    recovered{" "}
                    <span className="text-emerald-500/70">
                      ({metrics.treatmentRecoveryRatePercent}%)
                    </span>
                  </span>
                </div>
                <div className="w-full h-4 bg-slate-900 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(5, Number(metrics.treatmentRecoveryRatePercent || 0)))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-xs text-slate-500 font-mono">
              Loading simulation metrics...
            </div>
          )}
        </div>

        {/* Architecture Flow */}
        <div className="lg:col-span-2 p-5 flex flex-col justify-center">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              AI reasons. Deterministic policy decides. Code executes.
            </h2>
            <p className="text-slate-400 text-sm">
              The architecture ensures AI is never in direct control of
              financial transactions.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 w-full">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                <span className="text-slate-400 font-bold">1</span>
              </div>
              <div className="text-xs font-bold text-white">
                PAYMENT FAILURE
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Transaction rejected
              </div>
            </div>

            <div className="text-slate-700 rotate-90 md:rotate-0">→</div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-purple-900/30 border border-purple-500/30 flex items-center justify-center mb-3">
                <Cpu className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-xs font-bold text-purple-300">
                AI REASONING
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                "Why did this fail?"
              </div>
            </div>

            <div className="text-slate-700 rotate-90 md:rotate-0">→</div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-indigo-900/30 border border-indigo-500/30 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-xs font-bold text-indigo-300">
                POLICY GATE
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                "Is this allowed?"
              </div>
            </div>

            <div className="text-slate-700 rotate-90 md:rotate-0">→</div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-900/30 border border-emerald-500/30 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-xs font-bold text-emerald-300">
                EXECUTION
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Code triggers retry
              </div>
            </div>

            <div className="text-slate-700 rotate-90 md:rotate-0">→</div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                <span className="text-slate-400 font-bold">5</span>
              </div>
              <div className="text-xs font-bold text-white">AUDIT</div>
              <div className="text-[10px] text-slate-400 mt-1">
                Record everything
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECOVER-AI Recovery Funnel */}
      {metrics && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-6">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> RECOVERY
            PROGRESSION
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium">
            <div className="flex-1 flex flex-col items-center">
              <div className="text-slate-400 mb-1">FAILED PAYMENTS</div>
              <div className="text-2xl font-bold text-white">
                {metrics.treatmentCount}
              </div>
            </div>
            <div className="text-slate-600 rotate-90 md:rotate-0">→</div>
            <div className="flex-1 flex flex-col items-center">
              <div className="text-indigo-400 mb-1">AI DIAGNOSED</div>
              <div className="text-2xl font-bold text-indigo-300">
                {metrics.treatmentCount}
              </div>
            </div>
            <div className="text-slate-600 rotate-90 md:rotate-0">→</div>
            <div className="flex-1 flex flex-col items-center">
              <div className="text-purple-400 mb-1">RECOVERY DECISIONS</div>
              <div className="text-xs space-y-1 text-center mt-1">
                <div className="text-slate-300">
                  {metrics.escalationCount} Escalated
                </div>
                <div className="text-rose-400">
                  {metrics.policyBlockCount} Policy Blocked
                </div>
                <div className="text-amber-400">
                  {cases.filter((c) => c.fsmState === "P2P_PAUSED").length} P2P
                  Paused
                </div>
              </div>
            </div>
            <div className="text-slate-600 rotate-90 md:rotate-0">→</div>
            <div className="flex-1 flex flex-col items-center">
              <div className="text-emerald-400 mb-1">REVENUE RECOVERED</div>
              <div className="text-2xl font-bold text-emerald-400">
                ₹
                {(
                  Number(metrics.treatmentNetRecoveredPaise || 0) / 100
                ).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deterministic Safety Boundaries Grid */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" /> POLICY GUARDRAILS
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic financial limits — independent of the LLM.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
              <span className="font-bold text-white">3</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 tracking-wider">
                MAX RETRIES
              </div>
              <div className="text-xs text-slate-500">Limits dunning</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
              <span className="font-bold text-emerald-400">5%</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 tracking-wider">
                MAX DISCOUNT
              </div>
              <div className="text-xs text-slate-500">Protects margin</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
              <span className="font-bold text-purple-400">.70</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 tracking-wider">
                MIN CONFIDENCE
              </div>
              <div className="text-xs text-slate-500">Enforces certainty</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-900/30 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 tracking-wider">
                CUSTOMER OPT-OUT
              </div>
              <div className="text-xs text-slate-500">Immediate halt</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Recovery Cases Table & Filter Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 text-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-white">Recovery Cases Dashboard</h3>
            <button
              onClick={handleCreateDemoCase}
              disabled={demoCreating}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <PlusCircle
                className={`w-3.5 h-3.5 ${demoCreating ? "animate-spin" : ""}`}
              />
              {demoCreating ? "Creating..." : "Create & Run Demo Case"}
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["ALL", "PAID", "P2P_PAUSED", "POLICY_BLOCKED", "ESCALATED"].map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    filter === f
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {f}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-xs">
              <tr>
                <th className="p-3 font-medium">Case ID</th>
                <th className="p-3 font-medium">Failure Reason</th>
                <th className="p-3 font-medium text-right">Amount</th>
                <th className="p-3 font-medium text-center">FSM State</th>
                <th className="p-3 font-medium text-right">Recovered</th>
                <th className="p-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredCases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-mono text-xs text-indigo-300">
                    {c.id.slice(0, 8)}...
                  </td>
                  <td className="p-3 text-slate-300">
                    {c.FailureEvent?.[0]?.rawProviderCode ||
                      c.failureCode ||
                      "EXPIRED_CARD"}
                  </td>
                  <td className="p-3 text-white font-mono text-right text-xs">
                    ₹
                    {(Number(c.amountDuePaise || 0) / 100).toLocaleString(
                      "en-IN",
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.fsmState === "PAID"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : c.fsmState === "POLICY_BLOCKED"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : c.fsmState === "P2P_PAUSED"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : c.fsmState === "ESCALATED"
                                ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {c.fsmState}
                    </span>
                  </td>
                  <td className="p-3 font-bold font-mono text-emerald-400 text-right text-xs">
                    {c.recoveredPaise > 0
                      ? `₹${(Number(c.recoveredPaise) / 100).toLocaleString("en-IN")}`
                      : "-"}
                  </td>
                  <td className="p-3 text-slate-400 text-[11px] group-hover:text-indigo-400 transition-colors text-center">
                    Inspect →
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Detail Modal */}
      {selectedCase && (
        <CaseDetailModal
          caseData={selectedCase}
          onClose={() => setSelectedCase(null)}
        />
      )}
    </div>
  );
}
