import { useState } from "react";
import { AlertOctagon, CheckCircle2, Sliders, ArrowRight } from "lucide-react";

export function PolicyGateDemo() {
  const [currentState, setCurrentState] = useState("DIAGNOSED");
  const [action, setAction] = useState("RETRY_PAYMENT");
  const [retryCount, setRetryCount] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isOptedOut, setIsOptedOut] = useState(false);
  const [aiConfidence, setAiConfidence] = useState(0.92);

  const [decision, setDecision] = useState<{
    allowed: boolean;
    reason: string;
    policyId: string;
    violations: string[];
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/policy/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentState,
          action,
          retryCount: Number(retryCount),
          discountPercent: Number(discountPercent),
          isOptedOut,
          aiConfidence: Number(aiConfidence),
        }),
      });
      const data = await res.json();
      setDecision(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Policy Gatekeeper Playground</h3>
            <p className="text-xs text-slate-400 font-mono">Test deterministic financial boundary rules in real time</p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-800 font-mono">
          Pure Deterministic Rules
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Action Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-slate-400">Proposed Action</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          >
            <option value="RETRY_PAYMENT">RETRY_PAYMENT</option>
            <option value="CREATE_PAYMENT_LINK">CREATE_PAYMENT_LINK</option>
            <option value="OFFER_DISCOUNT">OFFER_DISCOUNT</option>
            <option value="SEND_REMINDER">SEND_REMINDER</option>
            <option value="ESCALATE">ESCALATE</option>
            <option value="HALT">HALT</option>
          </select>
        </div>

        {/* FSM State Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-slate-400">Current FSM State</label>
          <select
            value={currentState}
            onChange={(e) => setCurrentState(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          >
            <option value="FAILED">FAILED</option>
            <option value="DIAGNOSING">DIAGNOSING</option>
            <option value="DIAGNOSED">DIAGNOSED</option>
            <option value="ACTION_AUTHORIZED">ACTION_AUTHORIZED</option>
            <option value="AWAITING_PAYMENT">AWAITING_PAYMENT</option>
            <option value="P2P_PAUSED">P2P_PAUSED</option>
            <option value="PAID">PAID</option>
            <option value="POLICY_BLOCKED">POLICY_BLOCKED</option>
          </select>
        </div>

        {/* Retry Count */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-slate-400">Retry Count (Max 3)</label>
          <input
            type="number"
            min={0}
            max={10}
            value={retryCount}
            onChange={(e) => setRetryCount(Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {/* Discount Percent */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-slate-400">Discount % (Max 5%)</label>
          <input
            type="number"
            step="0.1"
            min={-1}
            max={50}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {/* AI Confidence */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-slate-400">AI Confidence (Min 0.70)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={aiConfidence}
            onChange={(e) => setAiConfidence(Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {/* Customer Opted Out Toggle */}
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isOptedOut}
              onChange={(e) => setIsOptedOut(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <span className="text-xs font-mono text-slate-300">Customer Opted Out</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleEvaluate}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
        >
          {loading ? "Evaluating..." : "Evaluate Policy"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Policy Evaluation Decision Result */}
      {decision && (
        <div
          className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
            decision.allowed
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {decision.allowed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertOctagon className="w-5 h-5 text-rose-400" />
              )}
              <span className="font-bold text-base tracking-wide font-mono">
                {decision.allowed ? "ALLOWED" : "DENIED"}
              </span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800">
              {decision.policyId}
            </span>
          </div>

          <p className="text-sm font-sans">{decision.reason}</p>

          {decision.violations.length > 0 && (
            <div className="mt-2 pt-2 border-t border-rose-500/20">
              <span className="text-xs font-mono uppercase tracking-wider text-rose-300">Violations:</span>
              <ul className="list-disc list-inside text-xs mt-1 space-y-1 text-rose-200">
                {decision.violations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
