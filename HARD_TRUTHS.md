# The Hard Truths: Executive Quant Review

This document provides direct, unhedged answers to the most critical flaws in the current iteration of the Signal Chain platform. 

### 1. The Meaninglessness of Current ML Metrics
> *"Right now, today, what accuracy/precision number does the ML model report, and are you willing to state clearly that this number is not meaningful until the split is fixed and market-beta is neutralized?"*

**YES.**
The model currently reports accuracies in the ~60-80% range (visible in the UI and `metrics.json`). I state clearly and without hedging: **These numbers are completely meaningless.** 
Because the training engine uses random shuffling (`train_test_split`) on time-series data, future market conditions leak into the training set. Furthermore, without market-beta neutralization, the model is often just predicting the broad direction of the S&P 500 during that week, rather than the isolated ripple effect of a specific supply chain event. Until these two architectural flaws are fixed, the reported accuracy is fiction.

### 2. Hypothesis Search Space and Noise Filtering
> *"How many total hypotheses (company-pair × event-type combinations) does the engine evaluate per run, and how many 'causal chains' currently pass the n≥3 threshold?"*

The engine is tightly constrained. It does **not** test thousands of combinations. It evaluates exactly **36** hardcoded hypothesis buckets per run (12 specific Event-Relationship logical pairings × 3 time windows: 1D, 5D, 10D). 
In recent runs of ~120 headlines, roughly **7 patterns** passed the `n>=3` threshold. Because the search space is locked to a small set of logical, human-defined economic theories (e.g., "supply disruption hurts downstream customers"), the `n>=3` heuristic is effectively filtering noise rather than p-hacking across thousands of random correlations.

### 3. LLM Hallucination Verification
> *"Has anyone manually spot-checked even 20–30 LLM-extracted events against the original headlines to eyeball the hallucination rate?"*

**NO.** 
A formal, documented manual review of 20-30 raw headlines against their Gemini-extracted JSON outputs has not yet been conducted. We currently rely purely on strict JSON schema enforcement to ensure data shape, but semantic accuracy (whether the LLM hallucinated a catalyst that didn't exist) remains unquantified. As you noted, everything downstream is mathematically useless if this rate is high. This manual spot-check is an immediate prerequisite.

### 4. Implementation Timeline for Fixes
> *"What is the actual timeline/effort estimate to implement a walk-forward split and market-beta neutralization — is this a day of work or a rebuild?"*

**This is 1-2 days of focused work, not a total rebuild.**
- **Walk-forward split:** Requires a localized change in `train.py` to sort the dataset by `published_at` and implement `TimeSeriesSplit` (or a strict chronological cutoff) instead of `random_state=42`. 
- **Market-beta neutralization:** Requires a minor update in `prices.py` to fetch `SPY` (or a sector ETF) alongside the target ticker, calculating the stock's return minus the benchmark's return over the exact same window. 
The core architecture (the graph, LLM ingestion, React frontend) remains completely intact.

### 5. Lookahead Bias in Small/Mid-Caps
> *"When adjusted-close vs point-in-time close diverges, does it disproportionately affect the same small/mid-cap tickers where your ripple effects are strongest?"*

**YES.** 
Small and mid-cap companies (the exact companies most susceptible to drastic supply chain ripple effects) undergo structural corporate actions (reverse splits, massive dividend issuances, capital restructuring) far more frequently than mega-caps. Yahoo Finance retroactively smooths historical prices (`Adjusted Close`) based on these future corporate actions. By backtesting against adjusted data rather than raw, point-in-time ticks, we inject severe lookahead bias directly into the most volatile layer of the knowledge graph. 
