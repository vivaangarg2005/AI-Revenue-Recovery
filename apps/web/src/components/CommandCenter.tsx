import { useState, useEffect } from "react";
import {
  TrendingUp,
  ShieldCheck,
  Cpu,
  Lock,
  PlusCircle,
} from "lucide-react";
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
          failureMessage: "Card expiry date has passed during subscription renewal",
          inboundP2PMessage: "We will pay this Friday after our billing cycle resets.",
        },
        {
          customerName: "Zomato Gold Partner",
          customerEmail: "billing@zomato-partner.in",
          customerPhone: "+919811122233",
          customerTier: "STANDARD",
          amountPaise: 99900, // ₹999
          failureCode: "GATEWAY_TIMEOUT",
          failureMessage: "HDFC bank payment gateway timed out during mandate debit",
          inboundP2PMessage: "Please retry in the evening, my account is active.",
        },
        {
          customerName: "Flipkart Seller Pro",
          customerEmail: "ops@flipkart-seller.com",
          customerPhone: "+919822233344",
          customerTier: "ENTERPRISE",
          amountPaise: 1499900, // ₹14,999
          failureCode: "INSUFFICIENT_FUNDS",
          failureMessage: "Insufficient funds in customer ICICI current account",
          inboundP2PMessage: "Salary payout is on 1st, please hold retries until then.",
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
          inboundP2PMessage: "Corporate card renewed, send me the new checkout link.",
        },
      ];

      const chosenScenario = demoScenarios[Math.floor(Math.random() * demoScenarios.length)];

      // 1. Create synthetic payment failure case
      const createRes = await fetch("/api/v1/recovery-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chosenScenario),
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Failed to create case (HTTP ${createRes.status})`);
      }
      const newCase = await createRes.json();

      // 2. Run automated recovery workflow
      const runRes = await fetch(`/api/v1/recovery-cases/${newCase.id}/run`, {
        method: "POST",
      });
      if (!runRes.ok) {
        const errData = await runRes.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Failed to run workflow (HTTP ${runRes.status})`);
      }
      const updatedCase = await runRes.json();

      // 3. Update list & open case detail modal
      setCases((prev) => [updatedCase, ...prev]);
      setSelectedCase(updatedCase);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to create recovery case. Ensure Database (PostgreSQL) is running.");
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
      {/* Mandated Safety Invariant Banner */}
      <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-indigo-300 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>ARCHITECTURAL INVARIANT:</span>
        </div>
        <div className="flex items-center gap-2 text-slate-200">
          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
            AI REASONING
          </span>
          <span className="text-slate-500">≠</span>
          <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            POLICY AUTHORIZATION
          </span>
          <span className="text-slate-500">≠</span>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            PAYMENT EXECUTION
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-xs font-mono text-rose-200 flex items-center justify-between gap-2">
          <span>⚠️ {errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="px-2 py-0.5 rounded bg-rose-900 hover:bg-rose-800 text-white font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top KPI Cards (Real Data from API) */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1 font-mono">
            <div className="text-[11px] text-slate-400">Total Money at Risk</div>
            <div className="text-xl font-bold text-white">
              ₹{(Number(metrics.totalRiskPaise || 0) / 100).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-slate-500">500 Synthetic Batch Cases</div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1 font-mono">
            <div className="text-[11px] text-slate-400">Control Net Recovery</div>
            <div className="text-xl font-bold text-slate-300">
              ₹{(Number(metrics.controlNetRecoveredPaise || 0) / 100).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-slate-500">Rate: {metrics.controlRecoveryRatePercent}%</div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1 font-mono">
            <div className="text-[11px] text-slate-400">RECOVER-AI Net Recovery</div>
            <div className="text-xl font-bold text-emerald-400">
              ₹{(Number(metrics.treatmentNetRecoveredPaise || 0) / 100).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-emerald-500 font-bold">Rate: {metrics.treatmentRecoveryRatePercent}%</div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 space-y-1 font-mono">
            <div className="text-[11px] text-indigo-300">Incremental Lift</div>
            <div className="text-xl font-bold text-indigo-400">
              +₹{(Number(metrics.incrementalRecoveredPaise || 0) / 100).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-emerald-400 font-bold">
              +{metrics.recoveryLiftPercent}% Treatment Lift
            </div>
          </div>
        </div>
      )}

      {/* Main Visual Comparison & How It Decides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Net Recovery Comparison */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 font-mono">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Control vs RECOVER-AI Net Recovery
            </h3>
            {metrics && (
              <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                +{metrics.recoveryLiftPercent}% Lift
              </span>
            )}
          </div>

          {metrics ? (
            <div className="space-y-4 font-mono py-2">
              {/* Control Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Control (Blind Retries)</span>
                  <span className="text-slate-300 font-bold">
                    ₹{(Number(metrics.controlNetRecoveredPaise || 0) / 100).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="w-full h-7 bg-slate-900 rounded-lg overflow-hidden p-1 border border-slate-800">
                  <div
                    className="h-full bg-slate-600 rounded-md transition-all duration-700 flex items-center justify-end pr-2 text-[10px] text-white font-bold"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(12, Number(metrics.controlRecoveryRatePercent || 0))
                      )}%`,
                    }}
                  >
                    {metrics.controlRecoveryRatePercent}%
                  </div>
                </div>
              </div>

              {/* RECOVER-AI Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    RECOVER-AI (Smart Engine)
                  </span>
                  <span className="text-emerald-400 font-bold text-sm">
                    ₹{(Number(metrics.treatmentNetRecoveredPaise || 0) / 100).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="w-full h-7 bg-slate-900 rounded-lg overflow-hidden p-1 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-md transition-all duration-700 flex items-center justify-end pr-2 text-[10px] text-slate-950 font-black"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(12, Number(metrics.treatmentRecoveryRatePercent || 0))
                      )}%`,
                    }}
                  >
                    {metrics.treatmentRecoveryRatePercent}%
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 text-center pt-1 border-t border-slate-800/60">
                Incremental Gain:{" "}
                <strong className="text-indigo-400">
                  +₹{(Number(metrics.incrementalRecoveredPaise || 0) / 100).toLocaleString("en-IN")}
                </strong>{" "}
                saved across batch
              </div>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-xs text-slate-500 font-mono">
              Loading simulation metrics...
            </div>
          )}
        </div>

        {/* How RECOVER-AI Decides Visual Flow (5 steps) */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 font-mono">
            <Cpu className="w-4 h-4 text-indigo-400" /> How RECOVER-AI Bounded Engine Decides
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-slate-500 font-bold text-[10px]">1. FAILURE</div>
              <div className="text-white font-bold text-xs">Payment Fails</div>
              <div className="text-slate-400 text-[10px]">Mandate timeout or card issue</div>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1">
              <div className="text-purple-400 font-bold text-[10px]">2. AI DIAGNOSIS</div>
              <div className="text-purple-200 font-bold text-xs">Diagnose Cause</div>
              <div className="text-slate-400 text-[10px]">Determines root failure reason</div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1">
              <div className="text-indigo-400 font-bold text-[10px]">3. POLICY GATE</div>
              <div className="text-indigo-200 font-bold text-xs">Verify Safety</div>
              <div className="text-slate-400 text-[10px]">5% discount cap & 3 retry cap</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
              <div className="text-emerald-400 font-bold text-[10px]">4. EXECUTION</div>
              <div className="text-emerald-200 font-bold text-xs">Execute Action</div>
              <div className="text-slate-400 text-[10px]">Razorpay payment link / retry</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-slate-500 font-bold text-[10px]">5. AUDIT</div>
              <div className="text-slate-300 font-bold text-xs">Audit Event</div>
              <div className="text-slate-400 text-[10px]">Immutable append-only log</div>
            </div>
          </div>
        </div>
      </div>

      {/* Deterministic Safety Boundaries Grid */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2 font-mono">
          <Lock className="w-4 h-4 text-emerald-400" /> Deterministic Hard Policy Safety Rules (Zero Hallucination)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[11px]">MAX RETRIES</div>
            <div className="text-base font-bold text-white mt-0.5">3 Attempts Cap</div>
            <div className="text-[10px] text-slate-500">Prevents excessive customer dunning</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[11px]">MAX DISCOUNT</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">5.0% Max Cap</div>
            <div className="text-[10px] text-slate-500">Protects merchant gross revenue</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[11px]">MIN AI CONFIDENCE</div>
            <div className="text-base font-bold text-purple-400 mt-0.5">0.70 Threshold</div>
            <div className="text-[10px] text-slate-500">Low confidence triggers escalation</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[11px]">CUSTOMER OPT-OUT</div>
            <div className="text-base font-bold text-rose-400 mt-0.5">100% Honored</div>
            <div className="text-[10px] text-slate-500">Immediate recovery halt</div>
          </div>
        </div>
      </div>

      {/* Recent Recovery Cases Table & Filter Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 font-mono text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-sm text-white">Recovery Cases Dashboard</h3>
            <button
              onClick={handleCreateDemoCase}
              disabled={demoCreating}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <PlusCircle className={`w-3.5 h-3.5 ${demoCreating ? "animate-spin" : ""}`} />
              {demoCreating ? "Creating..." : "Create & Run Demo Case"}
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["ALL", "PAID", "P2P_PAUSED", "POLICY_BLOCKED", "ESCALATED"].map((f) => (
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
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Case ID</th>
                <th className="p-3">Failure Reason</th>
                <th className="p-3">Amount</th>
                <th className="p-3">FSM State</th>
                <th className="p-3">Recovered</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredCases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-bold text-indigo-300">{c.id}</td>
                  <td className="p-3 text-slate-300">{c.failureCode || "EXPIRED_CARD"}</td>
                  <td className="p-3 text-white">₹{(Number(c.amountDuePaise || 0) / 100).toFixed(0)}</td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        c.fsmState === "PAID"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : c.fsmState === "POLICY_BLOCKED"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : c.fsmState === "P2P_PAUSED"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {c.fsmState}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-emerald-400">
                    ₹{(Number(c.recoveredPaise || 0) / 100).toFixed(0)}
                  </td>
                  <td className="p-3 text-slate-400 text-[11px] group-hover:text-indigo-400 transition-colors">Inspect Lifecycle →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Detail Modal */}
      {selectedCase && (
        <CaseDetailModal caseData={selectedCase} onClose={() => setSelectedCase(null)} />
      )}
    </div>
  );
}
