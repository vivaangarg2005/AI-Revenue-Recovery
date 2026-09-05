import { useState, useEffect } from "react";
import { TrendingUp, Info, RefreshCw } from "lucide-react";

export function SimulationLab() {
  const [metrics, setMetrics] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSimulationData = async () => {
    setLoading(true);
    try {
      const [metricsRes, casesRes] = await Promise.all([
        fetch("/api/v1/simulations/latest"),
        fetch("/api/v1/simulations/latest/cases"),
      ]);
      const metricsData = await metricsRes.json();
      const casesData = await casesRes.json();
      setMetrics(metricsData);
      setCases(casesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSimulation = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: 20260822 }),
      });
      const data = await res.json();
      setMetrics(data);

      const casesRes = await fetch(
        `/api/v1/simulations/${data.simulationId}/cases`,
      );
      const casesData = await casesRes.json();
      setCases(casesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulationData();
  }, []);

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col gap-6">
      {/* Disclaimer Banner (Mandatory Part 26 Rule) */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-mono text-amber-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>COUNTERFACTUAL EXPERIMENT:</strong> 500-case reproducible
            synthetic batch (not production payment data).
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
          Seed: 20260822
        </span>
      </div>

      {/* Header & Run Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-bold text-lg text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            500-Case Revenue Recovery Experiment Lab
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Counterfactual Evaluation: Control Baseline (250) vs RECOVER-AI
            Engine (250)
          </p>
        </div>

        <button
          onClick={handleTriggerSimulation}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs font-mono transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Executing 500 Cases..." : "Run 500-Case Experiment"}
        </button>
      </div>

      {/* KPI Cards Grid (Real Calculated Metrics) */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-mono">
              Total Risk (500 Cases)
            </div>
            <div className="text-lg font-bold text-white mt-1 font-mono">
              ₹
              {(Number(metrics.totalRiskPaise || 0) / 100).toLocaleString(
                "en-IN",
              )}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              250 Control / 250 Treatment
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-mono">
              Control Net Recovered
            </div>
            <div className="text-lg font-bold text-slate-300 mt-1 font-mono">
              ₹
              {(
                Number(metrics.controlNetRecoveredPaise || 0) / 100
              ).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              Rate: {metrics.controlRecoveryRatePercent}%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-mono">
              RECOVER-AI Net Recovered
            </div>
            <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
              ₹
              {(
                Number(metrics.treatmentNetRecoveredPaise || 0) / 100
              ).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-emerald-500/80 font-mono mt-1">
              Rate: {metrics.treatmentRecoveryRatePercent}%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-mono">
              AI Diagnosis Accuracy
            </div>
            <div className="text-lg font-bold text-purple-400 mt-1 font-mono">
              {metrics.aiDiagnosisAccuracyPercent}%
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              Escalations: {metrics.escalationCount} | Policy Blocks:{" "}
              {metrics.policyBlockCount}
            </div>
          </div>
        </div>
      )}

      {/* Counterfactual Case Comparison Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Counterfactual Paired Cases (First 15 Cases Preview)</span>
          <span>Showing {Math.min(15, cases.length)} of 250 Paired Cases</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Control Outcome</th>
                <th className="p-3">RECOVER-AI Category</th>
                <th className="p-3">Strategy Used</th>
                <th className="p-3">RECOVER-AI State</th>
                <th className="p-3">Net Recovered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {cases.slice(0, 15).map((c) => (
                <tr
                  key={c.caseIndex}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  <td className="p-3 font-bold text-slate-400">
                    #{c.caseIndex}
                  </td>
                  <td className="p-3 text-white">
                    ₹{(Number(c.amountPaise) / 100).toFixed(0)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        c.control.finalState === "PAID"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {c.control.finalState} (Retries: {c.control.retryCount})
                    </span>
                  </td>
                  <td className="p-3 text-purple-300">
                    {c.treatment.aiCategory}
                  </td>
                  <td className="p-3 text-indigo-300">
                    {c.treatment.strategyUsed}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        c.treatment.finalState === "PAID"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : c.treatment.finalState === "POLICY_BLOCKED"
                            ? "bg-rose-500/20 text-rose-400"
                            : c.treatment.finalState === "P2P_PAUSED"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {c.treatment.finalState}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-emerald-400">
                    ₹{(Number(c.treatment.netRecoveredPaise) / 100).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
