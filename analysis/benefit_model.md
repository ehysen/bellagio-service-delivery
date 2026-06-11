# Deliverable B — Public-Benefit Impact Model

> Inputs are the verified §6 benchmark figures. Demo-run figures (cases, ms/determination,
> QC findings) are measured from the actual run. Modeled assumptions are stated explicitly.

## (a) Processing-time compression

| Metric | Value |
|---|---|
| Engine time per determination (measured) | 0.00 ms (0.0000 s) |
| Normal processing standard | 30 days |
| Expedited processing standard | 7 days |
| Compression vs. 30-day standard | ~616,741,342,009× faster |
| Compression vs. 7-day expedited standard | ~143,906,313,136× faster |

The determination math itself is sub-second. The realistic public-benefit claim is **not** that
cases close in milliseconds — verification, interviews, and human review remain — but that the
**determination + QC + cited rationale** that today gates the 30-day clock is produced instantly,
removing the rules-computation bottleneck from the timeline and freeing caseworker time for the
judgment-heavy, human-required steps.

## (b) Error-rate reduction (FY2028 OBBBA penalty regime)

| Metric | Value |
|---|---|
| National SNAP payment error rate (FY2024) | 10.93% |
| States on corrective-action plans | 44 |
| QC findings raised during this run | 1 |
| Modeled QC catch rate (assumption) | 50.00% |
| Projected error rate after QC layer | 5.46% |
| Maryland cited exposure | $240,000,000 |
| Penalty at 10.93% (≥10% band → 15%) | $36,000,000 |
| Penalty at 5.46% | $0 |
| **Modeled penalty avoided** | **$36,000,000** |

**Penalty regime (OBBBA, FY2028):** 6–8% error → state pays 5% of benefits; 8–10% → 10%; ≥10% → 15%.
Maryland's FY2024-equivalent rate sits in the ≥10% band (15% penalty). Moving the rate below the
penalty thresholds is where the dollars are: the pre-certification QC layer is the mechanism, catching
the discrepancy classes (income under-reporting, unsupported shelter deductions, benefit miscalculation)
that drive the national rate — **before** certification rather than in a post-payment QC review.

> **Honesty note:** the QC catch rate is a modeled assumption, not a measured outcome. The defensible
> claim is mechanistic: each `QCFinding` corresponds to a specific §408 verification gap that would
> otherwise flow into a payment error. The dollar figure scales linearly with the catch-rate assumption;
> we expose the lever rather than bury it.
