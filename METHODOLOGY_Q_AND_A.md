# Signal Chain: Methodology, Limitations, and Quant Q&A

This document serves as an honest, rigorous breakdown of the assumptions, methodologies, and current limitations of the Signal Chain platform. As an early-stage Proof of Concept (POC), many components trade institutional-grade rigor for developmental velocity. This Q&A outlines exactly where the system currently stands and the roadmap for addressing these quantitative pitfalls.

---

### 1. The Knowledge Graph (Relationships)
**Q: Where does the graph data come from, and how fresh is it?**
A: In the current MVP, the graph is seeded from a static dataset mapping. It is not currently hydrated with live SEC 10-K filings or live supply chain feeds. A stale graph is a known limitation that will degrade signal quality over time.
**Q: How are edges weighted?**
A: Edges are currently unweighted categorical types (`supplier`, `customer`, `competitor`, `peer`). The system does not yet distinguish between a supplier responsible for 2% vs. 40% of revenue. Weighting is a critical v2 roadmap feature.
**Q: Is the graph symmetric or directional?**
A: The edges are directional. The hypothesis engine explicitly distinguishes the direction of the shock (e.g., a shock to a `customer` is treated differently than a shock to a `supplier`).

### 2. LLM Event Extraction
**Q: What is the hallucination/false-positive rate?**
A: Currently unmeasured by a formal human-labeled ground-truth set. We rely on strict JSON schema enforcement and prompt engineering to force the LLM to discard opinions and only extract hard events.
**Q: Does the LLM have lookahead bias (access to price/outcomes)?**
A: **No.** The LLM is fed strictly the text of the headline. It has zero access to timestamps, historical charts, or post-event market data during extraction.
**Q: How are events timestamped?**
A: They are timestamped using the exact `published_at` date of the article, not the ingestion time. 
**Q: Is the LLM deterministic?**
A: Because LLMs inherently sample from probability distributions, there is a small degree of non-determinism unless temperature is set strictly to `0.0`.

### 3. Backtest Engine
**Q: Point-in-time data or restated data?**
A: The system uses Yahoo Finance, which provides adjusted closes (accounting for splits/dividends retroactively). This introduces a degree of lookahead bias.
**Q: Survivorship bias?**
A: Yes. The current universe only contains actively traded tickers. Bankrupt or delisted companies are excluded, which traditionally inflates backtest returns.
**Q: What is the entry price assumption?**
A: The engine uses daily `Close` prices. It assumes entry at the Close on the day of the event (or the next available trading day) and exit at the Close `N` days later. It lacks intraday resolution to model buying "the exact minute a headline breaks."
**Q: Are transaction costs modeled?**
A: No. Slippage, bid-ask spread, and borrow fees are currently ignored.
**Q: Is there correction for multiple comparisons?**
A: No strict statistical corrections (e.g., Bonferroni) are applied yet. The engine requires a minimum occurrence threshold (`n>=3`) for a pattern to register, but this is a heuristic, not a statistical p-value threshold.

### 4. The ML Model
**Q: Train/test split methodology?**
A: **Random.** The MVP uses a random `train_test_split` (75/25) with class balancing. In time-series financial data, this is a known flaw. A strict walk-forward (time-series) split must be implemented before moving to production to prevent data leakage.
**Q: Do features contain future information?**
A: No. The features (`event_type`, `relationship_type`, `sentiment_score`, `magnitude`, `sector_match`) are all derived entirely from the text of the headline and the static graph.
**Q: Baseline comparison?**
A: The model's accuracy is currently evaluated against a balanced target, but it does not yet explicitly benchmark against a sector-ETF or momentum strategy baseline.

### 5. Causal Chains
**Q: Causation vs. Correlation?**
A: The term "Causal" is used in the product to describe the *logical pathway* (Event -> Supply Chain Edge -> Price). However, statistically, the system currently only measures historical correlation.
**Q: Controlling for market-wide/sector moves?**
A: The MVP does not neutralize against SPY (market beta) or sector-specific ETFs. A stock moving up might be due to a sector-wide rally rather than the specific supplier event. Market-neutralization (calculating the alpha residual rather than raw return) is the immediate next step for the backtest engine.

---
**Conclusion:** Signal Chain is a highly functional architecture for extracting unstructured text and mapping it to graph-based price action. However, before risking live capital, the backtest engine and ML model require institutional-grade hardening against survivorship bias, random splitting, and market beta correlation.
