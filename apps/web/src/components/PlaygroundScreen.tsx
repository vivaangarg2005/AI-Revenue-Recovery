import { Sparkles } from "lucide-react";
import { PolicyGateDemo } from "./PolicyGateDemo";
import { AIDiagnosisDemo } from "./AIDiagnosisDemo";

export function PlaygroundScreen() {
  return (
    <div className="space-y-8 font-sans">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Interactive Demo Playgrounds
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Test the LLM reasoning engine and the deterministic policy boundary in
          isolation.
        </p>
      </div>

      {/* AI Diagnosis & Intent Engine Playground */}
      <section className="space-y-3">
        <AIDiagnosisDemo />
      </section>

      {/* Policy Gatekeeper Hard Safety Rules Playground */}
      <section className="space-y-3">
        <PolicyGateDemo />
      </section>
    </div>
  );
}
