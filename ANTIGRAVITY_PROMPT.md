# CareWeave: build prompt for Antigravity

## How to use
1. Unzip this pack into a new folder and open that folder as a workspace in Antigravity.
2. Start a new task in Planning mode and paste everything under "THE PROMPT".
3. Read the implementation plan it produces. Approve it only if it follows the milestones below.
4. After each milestone, ask it to open the app in the browser, check the screen, and attach screenshots.
(Menu names in Antigravity may differ from these words; the idea is plan first, then build, then verify visually.)

---

## THE PROMPT

You are building **CareWeave**, a hospital operations web app for DATATHON 2026, Health track "The Forgotten Patient", team Uncharted. Today's deliverable is the **base prototype** (Round 1). A complete prototype is due in Round 2, so keep the code easy to extend. Read AGENTS.md and reference/careweave-reference.html first. Write an implementation plan and task list before coding. Then build milestone by milestone and verify each one in the browser.

### Product
- User: hospital operations managers and department coordinators.
- Question it answers: "What is likely to get delayed next, why, and what should the operations team examine first?"
- One workflow: set wait targets, see departments ranked by patients over target, open a department, read why, forecast a patient's wait, decide what to examine.
- Data: synthetic hospital data in data/ (patients 2,000; encounters 8,000; departments 12; diagnostic_tests 5,000).

### Hard rules (judges look for these)
1. The ML is ours: ml/train.py (numpy least squares plus empirical residual quantiles). No external AI or LLM API anywhere, including at runtime. The app only loads ml/artifacts/*.json.
2. Every number on screen comes from the artifacts or is computed from them. No invented statistics or placeholder charts.
3. Be honest about signal. Only department and triage level predict wait. Hour, weekday, month, demographics, visit type and department capacity added nothing (see `ablation` in model.json). Do not build UI that implies otherwise (no "rush hour" claims).
4. Diagnostic-test request times conflict with visit times (4,998 of 5,000 fall outside the linked visit). Show turnaround only. Never put tests on a patient timeline.
5. Never present output as clinical advice. Footer on every page: "Synthetic data. For operations use only."
6. Every flag must show its evidence and a confidence level.

### Stack
Next.js (App Router) + TypeScript + Tailwind. Charts with Recharts or hand-rolled SVG. Deploy on Vercel. No database. Copy ml/artifacts/*.json into src/data. Python is only for training.

```
src/lib/predict.ts     inference exactly as model.json "how_to_predict" says
src/lib/rank.ts        investigate-first ranking (spec below)
src/lib/types.ts
src/app/api/{predict,queue,departments/[id],diagnostics,model}/route.ts   thin wrappers
src/components/        TargetSliders, QueueTable, HeatCell, DeptDetail, ControlChart, ForecastCard, DiagnosticsTable, ModelPage, Thread (brand motif)
tests/predict.test.ts  Vitest: predict() must match ml/artifacts/parity.json within 0.01
```

### Artifact schema (what the JSON contains)
- model.json: intercept, dept_effect{id}, triage_effect{level}, residual_quantile_probs[99], residual_quantiles{level:[99]}, min_wait, evaluation{split, mae{...}, interval_p10_p90_coverage, calibration[], auc_wait_ge_60, alerts{...}}, ablation[].
- insights.json: overall{visits, mean_wait, triage_mean}, departments[]{id, name, service_type, staff, beds, daily_capacity, visits, mean_wait, triage_mix_effect, gap_vs_peers, gap_z, cells[{triage,n,mean,p10,p50,p90}], hist_10min_bins[4][16], weekly_z[52]}, diagnostics{by_test_type, by_priority, timeline_conflict}, data_quality{}.
- Triage order everywhere: Critical, High, Medium, Low. hist bin i covers waits [10i, 10i+10); the last bin is 150+.

### Screens
**Base prototype (build these):**
1. **Command center** (home). KPI strip: visits, average wait, share over target, top-ranked department. Target sliders for Critical/High/Medium/Low (defaults 20/40/60/90 min, step 10; label them as placeholders hospitals set themselves). "Investigate first" table: rank, department, average wait per triage level as heat cells with % over target, patients over target, evidence pill. Rows are selectable and keyboard accessible.
2. **Department detail** ("Why is this ranked here"). Decomposition: hospital average + triage mix + department effect = department mean. Three or four plain-language signals: gap vs peers with z, worst triage group vs target, capacity vs median, weeks outside 3 sigma. Weekly z-score control chart (2 sigma dashed, 3 sigma solid, Oct to Dec shaded as the period unseen at fit time).
3. **Forecast.** Department + triage (+ optional threshold) gives expected wait, P10 to P90, and chance of waiting at least the threshold, via /api/predict. Below it, the same triage level across all 12 departments as small bars, so the department effect is visible.
4. **Diagnostics monitor.** Turnaround by test type and priority (median, P90, share over 120 min). A banner explains the timeline conflict. Note that urgent tests are not faster than routine ones (median 57 vs 58 min).
5. **How CareWeave thinks.** Time split, MAE table (baseline, ours, challengers), feature ablation, interval coverage, calibration chart (predicted vs observed P(wait >= t)), alert backtest, data-quality list, limitations.

**Round 2 (leave clean hooks, do not build yet):** alert feed per department, upload a new encounters CSV and recompute in the browser, export the ranked list as CSV, four-week outlook, shareable URL state.

### Ranking spec
For department d and triage level k with target T_k: over_dk = visits with wait >= T_k, from hist_10min_bins (T_k is a multiple of 10, so bin sums are exact). over_d = sum over k. Weight from the gap: gap_vs_peers > 0 and gap_z >= 5 gives "Strong" (1.0); gap_z >= 2.5 gives "Moderate" (0.8); otherwise "Weak" (0.5); gap_vs_peers <= 0 gives "Faster than peers" (0.5). score = over_d x weight. Sort descending. Heat colour from ratio = mean / T_k: 0.6 teal, 1.0 amber, 1.4 or more red; never rely on colour alone (show the numbers).
Sanity check at the default targets: Pediatrics, Laboratory, Outpatient, Neurology, General Medicine rank 1 to 5, with gaps +8.6, +7.6, +6.4, +3.6, +2.5 min.

### Design
Brand: CareWeave. Navy #0B1F3A, cyan #19E3F5 (the DATATHON colour), coral #E5484D (warnings and accent), tints #E6FCFE and #F2F5F9. Font: Atkinson Hyperlegible. Motif: a woven thread (crossing navy and cyan threads, one coral thread meaning "the one to pull") in the logo, hero and empty states. Calm and accessible: WCAG AA contrast, visible focus, reduced-motion respected, usable at 390px width, light and dark themes. The reference file shows the logic and one possible layout; improve the design, do not copy it.

### Milestones
- M1: scaffold, load artifacts, predict.ts, rank.ts, parity test green.
- M2: command center with live re-ranking from the sliders.
- M3: department detail with decomposition, signals, control chart.
- M4: forecast, diagnostics, model page.
- M5: polish, mobile, accessibility pass, README, deploy to Vercel.

### Acceptance checks
- `npm run build` and `npm test` pass.
- On screen: 8,000 visits, mean wait 52.0 min, Pediatrics gap +8.6 min, MAE 13.72 vs baseline 20.09, interval coverage 79.6%.
- Moving a target slider re-ranks instantly with no reload.
- Keyboard-only path works through screens 1 to 3.
- No console errors. No network calls at runtime except fonts.
- Browser-verified screenshots of each screen attached to the task.

### Three-minute demo script to support
1. Problem in 20 seconds: waits are invisible until patients complain.
2. Command center: move the Critical target; the ranking changes.
3. Open Pediatrics: +8.6 min vs peers at the same triage level, steady and structural, not a spike.
4. Forecast Low triage in Pediatrics vs Cardiology: the department effect.
5. Model page: 32% lower error than the baseline; time and demographics did not help, and we say so.
6. Diagnostics: the timeline conflict banner, and why we only use turnaround.

### Rubric mapping (100 marks)
ML from scratch 25: ml/train.py + model page. Working product 20: screens 1 to 4 end to end. Data science quality 15: time split, baseline, ablation, calibration, coverage, backtest. Problem 10: persona and workflow. Dataset usage 10: joins, data-quality list. USP 10: explain every flag, honest ranges, triage-adjusted gaps. Impact 5: responsible-use and limits panel. Demo 5: script above.
