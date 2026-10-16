# Project rules for the coding agent (CareWeave, DATATHON 2026, team Uncharted)

- Read ANTIGRAVITY_PROMPT.md and reference/careweave-reference.html before planning. Plan first, then build in milestones; commit after each milestone.
- The data is synthetic. Show "Synthetic data. For operations use only." on every screen. Never present anything as clinical advice.
- Never invent numbers. Every figure comes from ml/artifacts/*.json or is computed from them. If a figure is missing, add it to ml/train.py and regenerate; do not hardcode.
- Do not edit data/ or ml/artifacts/ by hand. Regenerate with `python ml/train.py`.
- No external AI or LLM API, at build time or runtime. The model is ours (ml/train.py).
- Only department and triage level predict wait. Do not add UI that implies hour, weekday, month, age, sex, insurance or visit type matter.
- Diagnostic-test request times conflict with visit times. Show test turnaround only; never place tests on a patient timeline.
- Ask before adding a dependency. Keep `npm run build` and `npm test` green. Verify every screen in the browser before calling a milestone done.
