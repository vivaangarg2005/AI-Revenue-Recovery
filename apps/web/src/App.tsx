import { useState, useEffect } from "react";
import { ShieldCheck, LayoutDashboard, Beaker, Sparkles } from "lucide-react";
import { CommandCenter } from "./components/CommandCenter";
import { SimulationLabScreen } from "./components/SimulationLabScreen";
import { PlaygroundScreen } from "./components/PlaygroundScreen";

interface HealthResponse {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: { status: string };
  redis: { status: string };
  mockMode: boolean;
}

export function App() {
  const [activeTab, setActiveTab] = useState<"COMMAND_CENTER" | "EXPERIMENT_LAB" | "PLAYGROUND">("COMMAND_CENTER");
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetch("/api/v1/health")
      .then((res) => res.json())
      .then((data: HealthResponse) => setHealth(data))
      .catch((err) => console.error("Health check error:", err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-12">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="font-bold text-white tracking-wider text-base">RECOVER-AI</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SIMULATION MODE (MOCK)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hidden sm:inline-block">
                  Buildathon Track 03
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Autonomous, Policy-Bounded Subscription Revenue Recovery Engine
              </p>
            </div>
          </div>

          {/* System Health Badge */}
          {health && (
            <div className="flex items-center gap-3 font-mono text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start md:self-auto">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${health.status === "ok" || health.status === "OK" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                <span>Backend: {health.status}</span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-purple-400 font-bold">AI Provider: {(health as any).aiProviderName || "Mock"}</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-bold">Mock Mode: Active</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 border-t border-slate-800/60 pt-2 pb-2 overflow-x-auto font-mono text-xs">
          <button
            onClick={() => setActiveTab("COMMAND_CENTER")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-bold ${
              activeTab === "COMMAND_CENTER"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            RevOps Command Center
          </button>

          <button
            onClick={() => setActiveTab("EXPERIMENT_LAB")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-bold ${
              activeTab === "EXPERIMENT_LAB"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Beaker className="w-4 h-4" />
            500-Case Experiment Lab
          </button>

          <button
            onClick={() => setActiveTab("PLAYGROUND")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-bold ${
              activeTab === "PLAYGROUND"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI & Policy Playground
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === "COMMAND_CENTER" && <CommandCenter />}
        {activeTab === "EXPERIMENT_LAB" && <SimulationLabScreen />}
        {activeTab === "PLAYGROUND" && <PlaygroundScreen />}
      </main>
    </div>
  );
}
