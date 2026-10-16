# CareWeave

Hospital operations web app for DATATHON 2026, Health track "The Forgotten Patient", Team Uncharted.

## What it does

CareWeave answers: **"What is likely to get delayed next, why, and what should the operations team examine first?"**

It surfaces wait-time patterns across 12 hospital departments using 8,000 synthetic patient visits, with a lightweight ML model that operations staff can understand and trust.

> **Synthetic data. For operations use only. Not for clinical decisions.**

## Screens

| Screen | Path | Purpose |
|---|---|---|
| Command Center | `/` | KPI strip, target sliders, ranked queue table, department detail |
| Department Detail | `/departments/[id]` | Decomposition, signals, control chart |
| Forecast | `/forecast` | Expected wait + P10-P90 + P(>= target) for any dept + triage |
| Diagnostics | `/diagnostics` | Test turnaround by type and priority |
| How It Thinks | `/model` | MAE table, ablation, calibration, backtest, data quality |

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Inference**: Custom OLS additive model (numpy, in `ml/train.py`); no external AI/LLM API
- **Charts**: Hand-rolled SVG (control chart) - no chart library dependency
- **Data**: `src/data/model.json`, `src/data/insights.json`, `src/data/parity.json` (copied from `ml/artifacts/`)

## Key design decisions

1. **Only department + triage predict wait.** Hour, weekday, month, age, sex, insurance, and visit type were tested and showed no usable signal (see `/model`). No UI implies otherwise.
2. **No invented numbers.** Every figure comes from `ml/artifacts/*.json` or is computed from them.
3. **Diagnostic tests tracked separately.** 4,998 of 5,000 test request times fall outside the linked visit window, so tests are never placed on a patient timeline.
4. **Honest ranges.** P10-P90 from empirical residual quantiles; ~17 min of irreducible noise per visit.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # Vitest parity tests
npm run build    # Production build
```

## ML training

```bash
python ml/train.py   # Requires data/*.csv; writes ml/artifacts/*.json
```

Then copy artifacts: `cp ml/artifacts/*.json src/data/`

## Acceptance numbers

| Check | Value |
|---|---|
| Total visits | 8,000 |
| Mean wait | 52.0 min |
| Pediatrics gap | +8.6 min vs peers |
| MAE (our model) | 13.72 min |
| Baseline MAE | 20.09 min |
| Interval coverage | 79.6% |
| Default rank 1 | Pediatrics |

## Round 2 hooks (not built)

- Alert feed per department
- Upload encounters CSV and recompute in browser
- Export ranked list as CSV
- Four-week outlook
- Shareable URL state
