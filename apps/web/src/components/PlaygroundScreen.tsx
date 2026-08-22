import { Sparkles } from "lucide-react";
import { PolicyGateDemo } from "./PolicyGateDemo";
import { AIDiagnosisDemo } from "./AIDiagnosisDemo";

export function PlaygroundScreen() {
  return (
    <div className="space-y-8 font-sans">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
          <Sparkles className="w-5 h-5 text-purple-400" />
          AI & Policy Gatekeeper Engine Interactive Playground
        </h2>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Test structured AI payment failure diagnosis, Promise-to-Pay extraction, prompt injection defense, and hard policy boundary overrides.
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
