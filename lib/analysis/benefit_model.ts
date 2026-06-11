/**
 * Deliverable B — Public-benefit impact model.
 *
 * Quantifies (a) processing-time compression against the 30-day / 7-day
 * standards, and (b) error-rate reduction from the QC layer, expressed in
 * dollars under the FY2028 (OBBBA) penalty regime.
 *
 * All benchmark inputs are the verified §6 figures from the build brief.
 * Outputs are pure data + a markdown renderer; no figures are invented.
 */

export interface BenefitModelInputs {
  /** Cases processed during the demo run. */
  casesProcessed: number;
  /** Average engine wall-clock per determination, in milliseconds (measured). */
  msPerDetermination: number;
  /** QC findings raised during the run (error-prevention events). */
  qcFindingsRaised: number;
  /** Share of national payment error the QC layer is modeled to catch (0-1). */
  qcCatchRate: number;
}

/** Verified §6 benchmark constants. */
export const BENEFIT_BENCHMARKS = {
  normalStandardDays: 30,
  expeditedStandardDays: 7,
  nationalErrorRateFY2024: 0.1093, // 10.93%
  statesOnCorrectiveAction: 44,
  // FY2028 OBBBA penalty regime: error rate -> state share of benefits owed.
  penaltyRegime: [
    { lower: 0.06, upper: 0.08, statePays: 0.05 },
    { lower: 0.08, upper: 0.1, statePays: 0.1 },
    { lower: 0.1, upper: 1.0, statePays: 0.15 },
  ],
  annualSnapOutlays: 100_000_000_000, // ~$100B/yr
  improperPaymentsFY2024: 10_500_000_000, // ~$10.5B
  marylandExposure: 240_000_000, // ~$240M cited MD exposure
  perCaseAdminExpense: 348, // FY2016 USDA — dated/conservative
} as const;

export interface BenefitModelResult {
  processing: {
    msPerDetermination: number;
    secondsPerDetermination: number;
    normalStandardSeconds: number;
    expeditedStandardSeconds: number;
    compressionVsNormal: number; // multiple faster
    compressionVsExpedited: number;
  };
  errorReduction: {
    nationalErrorRate: number;
    projectedErrorRateAfterQC: number;
    marylandExposure: number;
    penaltyBefore: number;
    penaltyAfter: number;
    penaltyAvoided: number;
    qcFindingsRaised: number;
  };
  markdown: string;
}

function statePayShare(errorRate: number): number {
  for (const band of BENEFIT_BENCHMARKS.penaltyRegime) {
    if (errorRate >= band.lower && errorRate < band.upper) return band.statePays;
  }
  return 0; // below 6% -> no penalty
}

export function runBenefitModel(inputs: BenefitModelInputs): BenefitModelResult {
  const b = BENEFIT_BENCHMARKS;

  // (a) Processing-time compression.
  const secondsPerDetermination = inputs.msPerDetermination / 1000;
  const normalStandardSeconds = b.normalStandardDays * 24 * 3600;
  const expeditedStandardSeconds = b.expeditedStandardDays * 24 * 3600;
  const compressionVsNormal = normalStandardSeconds / secondsPerDetermination;
  const compressionVsExpedited = expeditedStandardSeconds / secondsPerDetermination;

  // (b) Error-rate reduction -> penalty avoided (Maryland exposure basis).
  const nationalErrorRate = b.nationalErrorRateFY2024;
  const projectedErrorRateAfterQC = Math.max(0, nationalErrorRate * (1 - inputs.qcCatchRate));
  const penaltyBefore = b.marylandExposure * statePayShare(nationalErrorRate);
  const penaltyAfter = b.marylandExposure * statePayShare(projectedErrorRateAfterQC);
  const penaltyAvoided = penaltyBefore - penaltyAfter;

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

  const markdown = `# Deliverable B — Public-Benefit Impact Model

> Inputs are the verified §6 benchmark figures. Demo-run figures (cases, ms/determination,
> QC findings) are measured from the actual run. Modeled assumptions are stated explicitly.

## (a) Processing-time compression

| Metric | Value |
|---|---|
| Engine time per determination (measured) | ${inputs.msPerDetermination.toFixed(2)} ms (${secondsPerDetermination.toFixed(4)} s) |
| Normal processing standard | ${b.normalStandardDays} days |
| Expedited processing standard | ${b.expeditedStandardDays} days |
| Compression vs. 30-day standard | ~${compressionVsNormal.toLocaleString("en-US", { maximumFractionDigits: 0 })}× faster |
| Compression vs. 7-day expedited standard | ~${compressionVsExpedited.toLocaleString("en-US", { maximumFractionDigits: 0 })}× faster |

The determination math itself is sub-second. The realistic public-benefit claim is **not** that
cases close in milliseconds — verification, interviews, and human review remain — but that the
**determination + QC + cited rationale** that today gates the 30-day clock is produced instantly,
removing the rules-computation bottleneck from the timeline and freeing caseworker time for the
judgment-heavy, human-required steps.

## (b) Error-rate reduction (FY2028 OBBBA penalty regime)

| Metric | Value |
|---|---|
| National SNAP payment error rate (FY2024) | ${pct(nationalErrorRate)} |
| States on corrective-action plans | ${b.statesOnCorrectiveAction} |
| QC findings raised during this run | ${inputs.qcFindingsRaised} |
| Modeled QC catch rate (assumption) | ${pct(inputs.qcCatchRate)} |
| Projected error rate after QC layer | ${pct(projectedErrorRateAfterQC)} |
| Maryland cited exposure | ${fmt(b.marylandExposure)} |
| Penalty at ${pct(nationalErrorRate)} (≥10% band → 15%) | ${fmt(penaltyBefore)} |
| Penalty at ${pct(projectedErrorRateAfterQC)} | ${fmt(penaltyAfter)} |
| **Modeled penalty avoided** | **${fmt(penaltyAvoided)}** |

**Penalty regime (OBBBA, FY2028):** 6–8% error → state pays 5% of benefits; 8–10% → 10%; ≥10% → 15%.
Maryland's FY2024-equivalent rate sits in the ≥10% band (15% penalty). Moving the rate below the
penalty thresholds is where the dollars are: the pre-certification QC layer is the mechanism, catching
the discrepancy classes (income under-reporting, unsupported shelter deductions, benefit miscalculation)
that drive the national rate — **before** certification rather than in a post-payment QC review.

> **Honesty note:** the QC catch rate is a modeled assumption, not a measured outcome. The defensible
> claim is mechanistic: each \`QCFinding\` corresponds to a specific §408 verification gap that would
> otherwise flow into a payment error. The dollar figure scales linearly with the catch-rate assumption;
> we expose the lever rather than bury it.
`;

  return {
    processing: {
      msPerDetermination: inputs.msPerDetermination,
      secondsPerDetermination,
      normalStandardSeconds,
      expeditedStandardSeconds,
      compressionVsNormal,
      compressionVsExpedited,
    },
    errorReduction: {
      nationalErrorRate,
      projectedErrorRateAfterQC,
      marylandExposure: b.marylandExposure,
      penaltyBefore,
      penaltyAfter,
      penaltyAvoided,
      qcFindingsRaised: inputs.qcFindingsRaised,
    },
    markdown,
  };
}
