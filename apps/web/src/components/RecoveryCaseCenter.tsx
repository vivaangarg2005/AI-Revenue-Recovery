import { useState } from "react";
import { Play, ShieldCheck, Cpu, CreditCard, Clock, Sparkles } from "lucide-react";

export function RecoveryCaseCenter() {
  const [createdCase, setCreatedCase] = useState<any>(null);
  const [workflowResult, setWorkflowResult] = useState<any>(null);
  const [p2pResult, setP2pResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [customMsg, setCustomMsg] = useState("I will pay this Friday after salary.");

  // Quick Preset Handlers
  const handleRunPreset = async (presetType: "TEMPORARY" | "PERMANENT" | "DISCOUNT_OVERRIDE") => {
    setLoading(true);
    setWorkflowResult(null);
    setP2pResult(null);

    try {
      let code = "GATEWAY_TIMEOUT";
      let msg = "Bank gateway timeout during debit attempt";
      let amountPaise = 99900;

      if (presetType === "PERMANENT") {
        code = "ACCOUNT_CLOSED";
        msg = "Mandate account permanently closed";
        amountPaise = 149900;
      }

      // 1. Create Case
      const createRes = await fetch("/api/v1/recovery-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ failureCode: code, failureMessage: msg, amountPaise }),
      });
      const caseData = await createRes.json();
      setCreatedCase(caseData);

      if (presetType === "DISCOUNT_OVERRIDE") {
        // Evaluate Excessive Discount
        const polRes = await fetch("/api/v1/policy/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentState: "DIAGNOSED",
            action: "OFFER_DISCOUNT",
            retryCount: 1,
            discountPercent: 20,
            isOptedOut: false,
            aiConfidence: 0.95,
          }),
        });
        const polData = await polRes.json();
        setWorkflowResult({
          caseId: caseData.id,
          initialState: "FAILED",
          finalState: "POLICY_BLOCKED",
          diagnosis: { category: "TEMPORARY_FAILURE", rootCause: "Gateway timeout", confidence: 0.95 },
          policyDecision: polData,
          paymentResult: null,
          recoveredPaise: "0",
        });
      } else {
        // Run Full Recovery Lifecycle
        const runRes = await fetch(`/api/v1/recovery-cases/${caseData.id}/run`, { method: "POST" });
        const runData = await runRes.json();
        setWorkflowResult(runData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendP2P = async () => {
    if (!createdCase) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/recovery-cases/${createdCase.id}/p2p`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: customMsg }),
      });
      const data = await res.json();
      setP2pResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Play className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white">End-to-End Recovery Case Command Center</h2>
            <p className="text-xs text-slate-400 font-mono">
              Execute full AI reasoning → Policy check → Payment execution lifecycle
            </p>
          </div>
        </div>

        {/* SIMULATED PAYMENT BADGE */}
        <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          SIMULATED PAYMENT (MOCK MODE)
        </div>
      </div>

      {/* Preset Action Launchers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => handleRunPreset("TEMPORARY")}
          disabled={loading}
          className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Scenario A</span>
            <Sparkles className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white mt-1">Temporary Timeout Failure</div>
          <div className="text-xs text-slate-400 mt-1">Gateway timeout → Retry succeeds → PAID</div>
        </button>

        <button
          onClick={() => handleRunPreset("PERMANENT")}
          disabled={loading}
          className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 text-left transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-rose-400 uppercase tracking-wider">Scenario B</span>
            <Sparkles className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white mt-1">Permanent Closed Account</div>
          <div className="text-xs text-slate-400 mt-1">Closed mandate → Escalated → ESCALATED</div>
        </button>

        <button
          onClick={() => handleRunPreset("DISCOUNT_OVERRIDE")}
          disabled={loading}
          className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Scenario C</span>
            <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white mt-1">Excessive Discount Request</div>
          <div className="text-xs text-slate-400 mt-1">AI 20% discount → Policy denies → POLICY_BLOCKED</div>
        </button>
      </div>

      {/* WORKFLOW PROGRESSION RESULTS */}
      {workflowResult && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          {/* FSM Lifecycle Timeline */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" /> FSM Lifecycle State Transition Timeline
            </span>

            <div className="flex items-center gap-2 overflow-x-auto py-2 font-mono text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 border border-slate-800">
                FAILED
              </span>
              <span className="text-slate-600 font-bold">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-purple-300 border border-purple-500/30">
                DIAGNOSING
              </span>
              <span className="text-slate-600 font-bold">→</span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-indigo-300 border border-indigo-500/30">
                DIAGNOSED
              </span>
              <span className="text-slate-600 font-bold">→</span>
              <span
                className={`px-3 py-1.5 rounded-lg border font-bold ${
                  workflowResult.finalState === "PAID"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : workflowResult.finalState === "POLICY_BLOCKED"
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                }`}
              >
                {workflowResult.finalState}
              </span>
            </div>
          </div>

          {/* Workflow Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: AI Diagnosis */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-purple-400 border-b border-slate-800 pb-2">
                <Cpu className="w-4 h-4" /> AI Diagnosis
              </div>
              <div className="text-xs font-mono">
                <span className="text-slate-500">Category:</span>{" "}
                <span className="text-slate-200">{workflowResult.diagnosis?.category}</span>
              </div>
              <div className="text-xs font-mono">
                <span className="text-slate-500">Root Cause:</span>{" "}
                <span className="text-slate-300">{workflowResult.diagnosis?.rootCause}</span>
              </div>
              <div className="text-xs font-mono">
                <span className="text-slate-500">Confidence:</span>{" "}
                <span className="text-emerald-400 font-bold">
                  {((workflowResult.diagnosis?.confidence || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Card 2: Policy Decision */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 border-b border-slate-800 pb-2">
                <ShieldCheck className="w-4 h-4" /> Policy Gatekeeper
              </div>
              <div className="text-xs font-mono">
                <span className="text-slate-500">Decision:</span>{" "}
                <span
                  className={`font-bold ${
                    workflowResult.policyDecision?.decision === "ALLOW" || workflowResult.policyDecision?.allowed
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {workflowResult.policyDecision?.decision || (workflowResult.policyDecision?.allowed ? "ALLOW" : "DENY")}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Rule: {workflowResult.policyDecision?.evaluatedRule || "STRICT_FINANCIAL_SAFETY_CEILING"}
              </div>
              {workflowResult.policyDecision?.violations?.length > 0 && (
                <div className="text-[11px] text-rose-300 bg-rose-950/40 p-2 rounded">
                  {workflowResult.policyDecision.violations[0]}
                </div>
              )}
            </div>

            {/* Card 3: Payment Result & Money Recovered */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 border-b border-slate-800 pb-2">
                <CreditCard className="w-4 h-4" /> Payment Execution
              </div>
              <div className="text-xs font-mono">
                <span className="text-slate-500">Status:</span>{" "}
                <span className="text-slate-200">
                  {workflowResult.paymentResult?.success ? "SUCCESS" : "NO_CHARGE"}
                </span>
              </div>
              <div className="text-xs font-mono">
                <span className="text-slate-500">Recovered Amount:</span>{" "}
                <span className="text-emerald-400 font-bold text-sm">
                  ₹{(Number(workflowResult.recoveredPaise || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {workflowResult.paymentResult?.paymentId || "Mock Execution Engine"}
              </div>
            </div>
          </div>

          {/* Promise-to-Pay Ingestion Component */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <span className="text-xs font-mono text-slate-300">Test Inbound Promise-to-Pay for this Case</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSendP2P}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium transition-all"
              >
                Send P2P
              </button>
            </div>

            {p2pResult && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono flex items-center justify-between">
                <span>
                  Intent: <strong className="text-indigo-300">{p2pResult.p2p?.intent}</strong>
                </span>
                <span>
                  FSM State: <strong className="text-purple-300">{p2pResult.fsmState}</strong>
                </span>
                <span className={p2pResult.accepted ? "text-emerald-400" : "text-rose-400"}>
                  {p2pResult.accepted ? "ACCEPTED & PAUSED" : "REJECTED"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
