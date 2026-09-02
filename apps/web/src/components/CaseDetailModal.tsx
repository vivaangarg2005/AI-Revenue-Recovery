import { X, ShieldCheck, Cpu, CreditCard, Clock, MessageSquare, FileText, User } from "lucide-react";

interface CaseDetailModalProps {
  caseData: any;
  onClose: () => void;
}

export function CaseDetailModal({ caseData, onClose }: CaseDetailModalProps) {
  if (!caseData) return null;

  const diagnosis = caseData.AIDiagnosis?.[0] || caseData.aiDiagnoses?.[0];
  const policy = caseData.PolicyDecision?.[0] || caseData.policyDecisions?.[0];
  const p2p = caseData.P2PCommitment?.[0] || caseData.p2pCommitments?.[0];
  const transitions = caseData.FSMTransition || caseData.fsmTransitions || [];
  const auditEvents = caseData.AuditEvent || caseData.auditEvents || [];

  const customer = caseData.subscription?.customer || caseData.customer;
  const amountDueINR = (Number(caseData.amountDuePaise || caseData.amountPaise || 0) / 100).toLocaleString("en-IN");
  const recoveredINR = (Number(caseData.recoveredPaise || caseData.amountRecoveredPaise || 0) / 100).toLocaleString("en-IN");

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                <span>Case ID:</span>
                <span className="text-indigo-300 font-bold">{caseData.id}</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">Recovery Case Detail & Audit Log</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                caseData.fsmState === "PAID"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : caseData.fsmState === "POLICY_BLOCKED"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  : caseData.fsmState === "P2P_PAUSED"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              {caseData.fsmState}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customer & Amount Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-xs">
            <div className="text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" /> Merchant Customer
            </div>
            <div className="text-slate-200 font-bold">{customer?.name || "Demo Customer"}</div>
            <div className="text-slate-400 text-[11px]">{customer?.email || "customer@example.com"}</div>
            <div className="text-slate-500 text-[10px]">Tier: {customer?.tier || "STANDARD"}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-xs">
            <div className="text-slate-500 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Amount at Risk
            </div>
            <div className="text-lg font-bold text-white">₹{amountDueINR}</div>
            <div className="text-slate-500 text-[10px]">Invoice: {caseData.invoiceId || "INV_DEMO_001"}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-xs">
            <div className="text-slate-500 flex items-center gap-1.5">
              <CheckCircle2Icon className="w-3.5 h-3.5 text-emerald-400" /> Net Recovered Money
            </div>
            <div className="text-lg font-bold text-emerald-400">₹{recoveredINR}</div>
            <div className="text-amber-400 text-[10px]">SIMULATED PAYMENT</div>
          </div>
        </div>

        {/* AI Diagnosis & Policy Decision Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI Diagnosis Card */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 text-purple-300 font-bold border-b border-purple-500/20 pb-2">
              <Cpu className="w-4 h-4 text-purple-400" /> AI Payment Failure Diagnosis
            </div>
            {diagnosis ? (
              <>
                <div>
                  <span className="text-slate-400">Category:</span>{" "}
                  <span className="text-purple-300 font-bold">{diagnosis.category}</span>
                </div>
                <div>
                  <span className="text-slate-400">Root Cause:</span>{" "}
                  <span className="text-slate-200 font-sans text-xs">{diagnosis.rootCause}</span>
                </div>
                <div>
                  <span className="text-slate-400">Confidence Score:</span>{" "}
                  <span className="text-emerald-400 font-bold">
                    {((diagnosis.confidence || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Recommended Strategy:</span>{" "}
                  <span className="text-indigo-300">{diagnosis.recommendedStrategy}</span>
                </div>
              </>
            ) : (
              <div className="text-slate-500 italic">No AI diagnosis recorded yet</div>
            )}
          </div>

          {/* Policy Decision Card */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 text-indigo-300 font-bold border-b border-indigo-500/20 pb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> Deterministic Policy Gatekeeper
            </div>
            {policy ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Authorization:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      policy.decision === "ALLOW"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {policy.decision}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Policy Hash:</span>{" "}
                  <span className="text-slate-400 text-[10px] break-all">{policy.policySignatureHash}</span>
                </div>
                {policy.violations && Array.isArray(policy.violations) && policy.violations.length > 0 && (
                  <div className="text-rose-300 bg-rose-950/40 p-2 rounded text-[11px] border border-rose-900/50">
                    Violation: {policy.violations[0]}
                  </div>
                )}
              </>
            ) : (
              <div className="text-slate-500 italic">No policy decision recorded yet</div>
            )}
          </div>
        </div>

        {/* FSM Lifecycle State Transition Timeline */}
        {transitions.length > 0 && (
          <div className="space-y-2 font-mono text-xs">
            <div className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" /> FSM State Transition Sequence
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
              {transitions.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                    <span className="text-slate-400">{t.fromState}</span>
                    <span className="text-indigo-400 font-bold">→</span>
                    <strong className="text-indigo-300 font-bold">{t.toState}</strong>
                  </span>
                  {i < transitions.length - 1 && <span className="text-slate-600 font-bold">→</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inbound Promise-to-Pay Section if present */}
        {p2p && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-indigo-300 font-bold">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" /> Customer Inbound Promise-to-Pay Commitment
              </span>
              <span className="text-slate-400 font-normal">Intent: {p2p.intent}</span>
            </div>
            <div className="text-slate-300 italic font-sans bg-slate-900 p-2.5 rounded">"{p2p.rawCustomerMessage || p2p.rawMessage}"</div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Extracted Promised Date: {p2p.promisedIsoDate || p2p.promisedDate || "None"}</span>
              <span className="text-emerald-400 font-bold">Automated Recovery Paused</span>
            </div>
          </div>
        )}

        {/* Chronological Audit Log */}
        {auditEvents.length > 0 && (
          <div className="space-y-2 font-mono text-xs">
            <div className="text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-purple-400" /> Chronological Security Audit Log (Append-Only)
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800">
              {auditEvents.map((evt: any, i: number) => (
                <div key={i} className="flex items-start justify-between text-[11px] border-b border-slate-900 pb-1">
                  <span className="text-purple-300 font-bold">{evt.eventType}</span>
                  <span className="text-slate-400">{evt.actor}</span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {new Date(evt.createdAt || evt.timestamp || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckCircle2Icon(props: any) {
  return <ShieldCheck {...props} />;
}
