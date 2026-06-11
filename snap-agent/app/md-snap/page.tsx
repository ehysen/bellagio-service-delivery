"use client";

import { useState } from "react";
import type { Determination, Household, QCFinding, UtilityStatus } from "@/lib/models";
import { KNOWN_CASES } from "@/lib/fixtures/households";

type Member = {
  age: string;
  elderly: boolean;
  disabled: boolean;
  earnedIncome: string;
  unearnedIncome: string;
  selfEmployment: boolean;
};

type Form = {
  members: Member[];
  shelterCost: string;
  utilityStatus: UtilityStatus;
  medicalExpenses: string;
  dependentCare: string;
  childSupportPaid: string;
  liquidAssets: string;
  homeless: boolean;
  applicationDay: string;
  earnedVerified: boolean;
};

const emptyMember = (): Member => ({
  age: "",
  elderly: false,
  disabled: false,
  earnedIncome: "",
  unearnedIncome: "",
  selfEmployment: false,
});

const blankForm = (): Form => ({
  members: [emptyMember()],
  shelterCost: "",
  utilityStatus: "heating_cooling",
  medicalExpenses: "",
  dependentCare: "",
  childSupportPaid: "",
  liquidAssets: "",
  homeless: false,
  applicationDay: "",
  earnedVerified: true,
});

function formToHousehold(f: Form): Household {
  return {
    members: f.members.map((m, i) => ({
      id: `m${i + 1}`,
      age: Number(m.age) || 0,
      elderly: m.elderly || undefined,
      disabled: m.disabled || undefined,
      earnedIncome: Number(m.earnedIncome) || 0,
      unearnedIncome: Number(m.unearnedIncome) || 0,
      selfEmployment: m.selfEmployment || undefined,
    })),
    shelterCost: Number(f.shelterCost) || 0,
    utilityStatus: f.utilityStatus,
    medicalExpenses: Number(f.medicalExpenses) || 0,
    dependentCare: Number(f.dependentCare) || 0,
    childSupportPaid: Number(f.childSupportPaid) || 0,
    liquidAssets: Number(f.liquidAssets) || 0,
    homeless: f.homeless || undefined,
    applicationDay: f.applicationDay ? Number(f.applicationDay) : undefined,
    verification: {
      earnedIncome: f.earnedVerified ? "verified" : "unverified",
      shelterCost: "verified",
      unearnedIncome: "verified",
      liquidAssets: "verified",
      disability: "verified",
      householdComposition: "verified",
    },
  };
}

function householdToForm(h: Household): Form {
  return {
    members: h.members.map((m) => ({
      age: String(m.age),
      elderly: !!m.elderly,
      disabled: !!m.disabled,
      earnedIncome: m.earnedIncome ? String(m.earnedIncome) : "",
      unearnedIncome: m.unearnedIncome ? String(m.unearnedIncome) : "",
      selfEmployment: !!m.selfEmployment,
    })),
    shelterCost: h.shelterCost ? String(h.shelterCost) : "",
    utilityStatus: h.utilityStatus,
    medicalExpenses: h.medicalExpenses ? String(h.medicalExpenses) : "",
    dependentCare: h.dependentCare ? String(h.dependentCare) : "",
    childSupportPaid: h.childSupportPaid ? String(h.childSupportPaid) : "",
    liquidAssets: h.liquidAssets ? String(h.liquidAssets) : "",
    homeless: !!h.homeless,
    applicationDay: h.applicationDay ? String(h.applicationDay) : "",
    earnedVerified: h.verification?.earnedIncome !== "unverified",
  };
}

const decisionClass: Record<string, string> = {
  eligible: "d-eligible",
  ineligible: "d-ineligible",
  pending_verification: "d-pending",
  needs_human_review: "d-review",
};
const decisionLabel: Record<string, string> = {
  eligible: "Eligible (recommended)",
  ineligible: "Not eligible (recommended)",
  pending_verification: "Pending verification — human review",
  needs_human_review: "Needs human review",
};

export default function Page() {
  const [form, setForm] = useState<Form>(householdToForm(KNOWN_CASES[0].household));
  const [det, setDet] = useState<Determination | null>(null);
  const [qc, setQc] = useState<QCFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const setMember = (i: number, patch: Partial<Member>) =>
    setForm((f) => ({ ...f, members: f.members.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/determine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToHousehold(form)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setDet(data.determination);
      setQc(data.qcFindings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setDet(null);
    } finally {
      setLoading(false);
    }
  }

  const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

  return (
    <div className="wrap">
      <header className="masthead">
        <div className="badge">Proof of Concept · Decision support, not autopilot</div>
        <h1>SNAP Eligibility Agent — Maryland Food Supplement Program</h1>
        <p>
          FY2026 rules translated from the published policy manual into citation-backed determination
          logic, with a pre-certification QC layer. The agent recommends; a human decides.
        </p>
      </header>

      <div className="grid">
        <div>
          <div className="panel">
            <h2>Load a known-answer case</h2>
            <div className="presets">
              {KNOWN_CASES.map((kc) => (
                <button key={kc.name} onClick={() => { setForm(householdToForm(kc.household)); setDet(null); }}>
                  {kc.household.caseId}
                </button>
              ))}
              <button onClick={() => { setForm(blankForm()); setDet(null); }}>Clear</button>
            </div>
            <p className="hint">Presets load the eight falsifiable test households (hand-calculated to the dollar).</p>
          </div>

          <div className="panel">
            <h2>Household</h2>
            {form.members.map((m, i) => (
              <div key={i} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10, marginBottom: 10 }}>
                <label>Member {i + 1}</label>
                <div className="row">
                  <div>
                    <input placeholder="Age" inputMode="numeric" value={m.age} onChange={(e) => setMember(i, { age: e.target.value })} />
                  </div>
                  <div>
                    <input placeholder="Earned $/mo" inputMode="numeric" value={m.earnedIncome} onChange={(e) => setMember(i, { earnedIncome: e.target.value })} />
                  </div>
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  <input placeholder="Unearned $/mo" inputMode="numeric" value={m.unearnedIncome} onChange={(e) => setMember(i, { unearnedIncome: e.target.value })} />
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <label className="check"><input type="checkbox" checked={m.elderly} onChange={(e) => setMember(i, { elderly: e.target.checked })} />Elderly</label>
                    <label className="check"><input type="checkbox" checked={m.disabled} onChange={(e) => setMember(i, { disabled: e.target.checked })} />Disabled</label>
                  </div>
                </div>
                <label className="check"><input type="checkbox" checked={m.selfEmployment} onChange={(e) => setMember(i, { selfEmployment: e.target.checked })} />Self-employment income</label>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="secondary" onClick={() => set({ members: [...form.members, emptyMember()] })}>+ Add member</button>
              {form.members.length > 1 && (
                <button className="secondary" onClick={() => set({ members: form.members.slice(0, -1) })}>− Remove</button>
              )}
            </div>
          </div>

          <div className="panel">
            <h2>Expenses & assets</h2>
            <div className="row">
              <div>
                <label>Shelter $/mo</label>
                <input inputMode="numeric" value={form.shelterCost} onChange={(e) => set({ shelterCost: e.target.value })} />
              </div>
              <div>
                <label>Utilities</label>
                <select value={form.utilityStatus} onChange={(e) => set({ utilityStatus: e.target.value as UtilityStatus })}>
                  <option value="heating_cooling">SUA (heating/cooling)</option>
                  <option value="limited">Limited (LUA)</option>
                  <option value="phone_only">Phone only</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <div><label>Medical $/mo</label><input inputMode="numeric" value={form.medicalExpenses} onChange={(e) => set({ medicalExpenses: e.target.value })} /></div>
              <div><label>Dependent care $/mo</label><input inputMode="numeric" value={form.dependentCare} onChange={(e) => set({ dependentCare: e.target.value })} /></div>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <div><label>Child support paid $/mo</label><input inputMode="numeric" value={form.childSupportPaid} onChange={(e) => set({ childSupportPaid: e.target.value })} /></div>
              <div><label>Liquid assets $</label><input inputMode="numeric" value={form.liquidAssets} onChange={(e) => set({ liquidAssets: e.target.value })} /></div>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <div><label>Application day (1–31)</label><input inputMode="numeric" value={form.applicationDay} onChange={(e) => set({ applicationDay: e.target.value })} /><p className="hint">Set to prorate first month.</p></div>
              <div style={{ paddingTop: 26 }}>
                <label className="check"><input type="checkbox" checked={form.homeless} onChange={(e) => set({ homeless: e.target.checked })} />Homeless / unsheltered</label>
                <label className="check"><input type="checkbox" checked={!form.earnedVerified} onChange={(e) => set({ earnedVerified: !e.target.checked })} />Income unverified (§408)</label>
              </div>
            </div>
            <button onClick={run} disabled={loading}>{loading ? "Determining…" : "Run determination"}</button>
          </div>
        </div>

        <div>
          {error && <div className="panel"><span className="sev sev-high">Error:</span> {error}</div>}

          {!det && !error && (
            <div className="panel">
              <h2>Determination</h2>
              <p className="empty">Enter a household (or load a preset) and run a determination. You will see the recommended decision, the monthly benefit, the full cited rationale, items flagged for human judgment, and pre-certification QC findings.</p>
            </div>
          )}

          {det && (
            <>
              <div className="panel">
                <h2>Determination (recommended — a human decides)</h2>
                <div className={`decision ${decisionClass[det.decision]}`}>
                  <span className="amount">{money(det.monthlyBenefit)}</span>
                  <div>
                    <div className="label">{decisionLabel[det.decision]}</div>
                    {det.ongoingMonthlyBenefit !== det.monthlyBenefit && (
                      <div className="hint">Ongoing monthly: {money(det.ongoingMonthlyBenefit)} (first month prorated)</div>
                    )}
                    {det.expeditedEligible && <div className="hint">Expedited service — 7-day standard (§401)</div>}
                  </div>
                </div>
                <div className="compute-grid" style={{ marginTop: 14 }}>
                  <span className="k">Household size</span><span className="v">{det.computation.householdSize}</span>
                  <span className="k">Gross income</span><span className="v">{money(det.computation.grossIncome)}</span>
                  <span className="k">Net income</span><span className="v">{money(det.computation.netIncome)}</span>
                  <span className="k">Excess shelter deduction</span><span className="v">{money(det.computation.excessShelterDeduction)}</span>
                  <span className="k">Gross limit (130%)</span><span className="v">{money(det.computation.grossIncomeLimit)}</span>
                  <span className="k">Net limit (100%)</span><span className="v">{money(det.computation.netIncomeLimit)}</span>
                </div>
              </div>

              <div className="panel">
                <h2>Cited rationale ({det.rationale.length} steps)</h2>
                <table>
                  <thead><tr><th>Step</th><th>Value</th><th>Basis & citation</th></tr></thead>
                  <tbody>
                    {det.rationale.map((r, i) => (
                      <tr key={i}>
                        <td>{r.label}</td>
                        <td className="val">{typeof r.value === "number" ? money(r.value) : String(r.value)}</td>
                        <td>{r.reason}<br /><span className="cite">{r.citation}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel">
                <h2>Flagged for human judgment ({det.flags.length})</h2>
                {det.flags.length === 0 && <p className="empty">No items flagged.</p>}
                {det.flags.map((fl, i) => (
                  <div key={i} className={`flag sev-${fl.severity}`}>
                    <span className={`sev sev-${fl.severity}`}>{fl.severity}</span> — {fl.message}
                    <br /><span className="cite">{fl.citation}</span>
                  </div>
                ))}
              </div>

              <div className="panel">
                <h2>Pre-certification QC findings ({qc.length})</h2>
                {qc.length === 0 && <p className="empty">No discrepancies detected by the QC layer.</p>}
                {qc.map((q, i) => (
                  <div key={i} className={`finding sev-${q.severity}`}>
                    <span className={`sev sev-${q.severity}`}>{q.severity}</span> — {q.message}
                    <br /><span className="cite">{q.citation}</span>
                  </div>
                ))}
                <p className="guardrail">
                  Guardrails: every determination ships with citations; unverified inputs return
                  “pending verification — human review,” never an auto-denial; no final adverse action is
                  automated. This is a translation-speed and QC accelerator — not a replacement for the
                  state’s system of record.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="footer">
        SNAP Eligibility Agent · Proof of Concept · Maryland FSP FY2026 (eff. Oct 1 2025). Dollar figures
        verified against MD DHS §600 / USDA FY2026 COLA. See <code>translation_report.md</code>,{" "}
        <code>build_log.json</code>, and <code>analysis/</code> for the three demonstration deliverables.
      </div>
    </div>
  );
}
