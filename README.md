# CareWeave handoff pack
- ANTIGRAVITY_PROMPT.md : paste-ready build prompt, with milestones and acceptance checks
- AGENTS.md             : standing rules for the agent
- data/                 : the four organiser CSVs (synthetic)
- ml/train.py           : training, evaluation, ablation, alert backtest. `pip install pandas numpy scikit-learn` then `python ml/train.py`
- ml/artifacts/         : model.json, insights.json, parity.json (generated; the app reads these)
- reference/            : working single-file dashboard, for logic and layout only
