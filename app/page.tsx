import Link from "next/link";

export default function Home() {
  return (
    <div className="wrap">
      <header className="masthead">
        <div className="badge">Proof of Concept · Decision support, not autopilot</div>
        <h1>SNAP Eligibility Agent</h1>
        <p>
          Translating published state SNAP policy into auditable, citation-backed determination logic —
          with a pre-certification QC layer. The agent recommends; a human decides.
        </p>
      </header>

      <div className="panel">
        <h2>Examples</h2>
        <p style={{ marginTop: 0 }}>
          <Link href="/md-snap" style={{ fontWeight: 600, fontSize: 16 }}>
            → Maryland — Food Supplement Program (FY2026)
          </Link>
        </p>
        <p className="hint">
          FY2026 rules (effective Oct 1 2025) translated from the Maryland policy manual, with every rule
          tied to its source section. Enter a household and see the recommended determination, the monthly
          benefit, the full cited rationale, items flagged for human judgment, and pre-certification QC
          findings.
        </p>
      </div>

      <div className="panel">
        <h2>The three demonstration deliverables</h2>
        <table>
          <thead>
            <tr>
              <th>Deliverable</th>
              <th>Artifact</th>
              <th>What it shows</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="val">A</td>
              <td><code>translation_report.md</code></td>
              <td>Each §policy section → the function that implements it → the test that proves it, plus the ingest→green wall-clock.</td>
            </tr>
            <tr>
              <td className="val">B</td>
              <td><code>analysis/benefit_model.md</code></td>
              <td>Processing-time compression and error-rate reduction in dollars under the FY2028 OBBBA penalty regime.</td>
            </tr>
            <tr>
              <td className="val">C</td>
              <td><code>analysis/cost_model.md</code></td>
              <td>System-integrator build/change vs. agent-built; human caseworker per-case vs. agent token cost per case.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <p className="guardrail" style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
          Guardrails: every determination ships with citations; unverified inputs return “pending
          verification — human review,” never an auto-denial; no final adverse action is automated. This is
          a translation-speed and QC accelerator — not a replacement for a state’s system of record.
        </p>
      </div>

      <div className="footer">
        SNAP Eligibility Agent · Proof of Concept · Maryland FSP FY2026 (eff. Oct 1 2025). Dollar figures
        verified against MD DHS §600 / USDA FY2026 COLA.
      </div>
    </div>
  );
}
