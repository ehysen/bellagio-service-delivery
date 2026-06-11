/**
 * agp/certificate-html.ts — render a Certificate of Eligibility as a styled,
 * printable HTML page (served at GET /certificate/:id). Demonstration only.
 */
import type { CertificateOfEligibility } from "@/agp/types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fmtDate(iso: string): string {
  // iso is YYYY-MM-DD; render as Month D, YYYY without TZ surprises.
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[(m ?? 1) - 1]} ${d}, ${y}`;
}

export function certificateHtml(c: CertificateOfEligibility): string {
  const cites = c.legalBasis.length
    ? c.legalBasis.map((x) => `<li>${esc(x)}</li>`).join("")
    : "<li>MD-FSP §409/§600; §115; §212–§214; §408</li>";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="data:,">
<title>Certificate of Eligibility — ${esc(c.program)}</title>
<style>
  :root{ --ink:#1a2433; --soft:#4a5568; --line:#d9d2c4; --accent:#1f4f43; --gold:#9a7b2e; --paper:#fbfaf7; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,"Times New Roman",serif;background:#ece6da;color:var(--ink);padding:28px 16px;}
  .demo{max-width:780px;margin:0 auto 14px;background:#fbe8e8;border:1px solid #e3b7b7;color:#8a2b2b;
        border-radius:10px;padding:10px 14px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;text-align:center;font-weight:600;}
  .cert{max-width:780px;margin:0 auto;background:var(--paper);border:1px solid var(--line);
        border-radius:6px;padding:40px 48px 36px;box-shadow:0 18px 50px rgba(20,25,35,.12);
        border-top:6px solid var(--accent);}
  .seal{float:right;width:84px;height:84px;border:2px solid var(--gold);border-radius:50%;
        display:flex;align-items:center;justify-content:center;color:var(--gold);font-size:11px;
        text-align:center;line-height:1.2;font-family:-apple-system,Segoe UI,sans-serif;letter-spacing:.04em;}
  .agency{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--soft);}
  h1{font-size:27px;margin:8px 0 2px;letter-spacing:.01em;}
  .program{font-size:15px;color:var(--accent);font-style:italic;margin-bottom:18px;}
  .lede{font-size:15px;line-height:1.6;color:var(--ink);margin-bottom:18px;}
  .lede b{color:var(--accent);}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 28px;border-top:1px solid var(--line);
        border-bottom:1px solid var(--line);padding:16px 0;margin-bottom:16px;}
  .f .k{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft);font-family:-apple-system,Segoe UI,sans-serif;}
  .f .v{font-size:16px;margin-top:2px;}
  .benefit .v{font-size:22px;color:var(--accent);font-weight:bold;}
  .basis{font-size:13px;color:var(--soft);margin-bottom:6px;}
  .basis ul{margin:6px 0 0 18px;}
  .basis li{margin:2px 0;}
  .sig{display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px;}
  .sig .line{border-top:1px solid var(--ink);width:230px;padding-top:5px;font-size:12px;color:var(--soft);}
  .sig .meta{font-size:12px;color:var(--soft);text-align:right;font-family:-apple-system,Segoe UI,sans-serif;}
  .foot{margin-top:22px;font-size:11px;color:var(--soft);line-height:1.5;font-family:-apple-system,Segoe UI,sans-serif;border-top:1px dashed var(--line);padding-top:12px;}
</style></head><body>
  <div class="demo">⚠️ DEMONSTRATION ONLY — ${esc(c.disclaimer)}</div>
  <div class="cert">
    <div class="seal">DEMO<br>SEAL</div>
    <div class="agency">${esc(c.agencyOfRecord)}</div>
    <h1>Certificate of Eligibility</h1>
    <div class="program">${esc(c.program)}</div>
    <p class="lede">This certifies that <b>${esc(c.constituentName)}</b>, a household of
      <b>${c.householdSize}</b>, has been determined <b>ELIGIBLE</b> for benefits under the program
      named above, effective <b>${fmtDate(c.effectiveDate)}</b>.</p>
    <div class="grid">
      <div class="f benefit"><div class="k">Monthly benefit</div><div class="v">$${c.monthlyBenefit} / month</div></div>
      <div class="f"><div class="k">Decision</div><div class="v">Approved</div></div>
      <div class="f"><div class="k">Effective date</div><div class="v">${fmtDate(c.effectiveDate)}</div></div>
      <div class="f"><div class="k">Certification period</div><div class="v">${c.certificationPeriodMonths} months — recertify by ${fmtDate(c.recertifyBy)}</div></div>
      <div class="f"><div class="k">Certificate ID</div><div class="v">${esc(c.certificateId)}</div></div>
      <div class="f"><div class="k">Case / Receipt</div><div class="v">${esc(c.receiptId)}</div></div>
    </div>
    <div class="basis"><b>Legal basis</b><ul>${cites}</ul></div>
    <div class="sig">
      <div class="line">Authorized determination (simulated)</div>
      <div class="meta">Issued ${esc(c.issuedAt.slice(0, 10))}<br>${esc(c.agencyOfRecord)}</div>
    </div>
    <div class="foot">${esc(c.disclaimer)} Generated by the Agentic Government Protocol (AGP) reference
      demo. Determinations are made by the agency of record; this artifact has no legal effect.</div>
  </div>
</body></html>`;
}
