# System Architecture Reality Check

This document outlines the exact technical shape of the Signal Chain platform as it exists right now, today, stripping away all aspirations and describing the naked MVP architecture.

### 1. Orchestration
> *"Is this currently a manually-triggered script/notebook run, or is there any scheduler running any part of the pipeline automatically?"*

**100% Manually Triggered.** 
There is absolutely zero automation, cron, or Airflow scheduling. The entire pipeline executes only when a human clicks "Start" or "Ingest Data" in the React frontend. That click hits a Django API, which spins up a single background Python thread to run the batch process. If no human clicks the button, the system does nothing.

### 2. Data Ingestion Cadence
> *"Where do the raw news headlines currently come from... What's the actual freshness?"*

**Static File Uploads.**
There is no live news API, no RSS ingestion, and no scraping. The user manually uploads a static CSV file (like a Kaggle dataset) through the web UI. Consequently, the "freshness" of the data is completely dictated by the uploaded file—right now, the system is actively evaluating static historical events from 2023.

### 3. Price Data Cadence
> *"Is Yahoo Finance data pulled fresh per run, or cached/stored locally?"*

**Cached locally on disk.**
When the backtester encounters a ticker it hasn't seen before, it downloads the 5-year history from Yahoo Finance and immediately saves it as a static CSV in `backend/market/data/_price_cache/`. Future runs read exclusively from this local CSV to save time and API calls. This means the price data is as fresh as the exact moment that specific ticker was first queried. The data becomes permanently stale unless a human manually deletes the cache folder to force a re-download.

### 4. Storage Layer
> *"What's persisting state between runs... Is the Knowledge Graph stored anywhere queryable?"*

**Local SQLite Database.**
All state is persisted to a local `db.sqlite3` relational database. The Knowledge Graph is not built temporarily in memory; it is permanently stored in standard relational tables (`market_company` and `market_relationship`). It is fully queryable via SQL or the Django ORM between runs.

### 5. Pipeline Boundaries
> *"Walk me through what currently happens end-to-end when you run the system once..."*

The current flow is a single, uninterrupted batch thread triggered by the user:
1. **Manual:** User uploads a static CSV of historical headlines.
2. **Auto:** A background Python thread reads the CSV row by row.
3. **Auto:** Gemini LLM is called synchronously for each headline. If a catalyst is found, it is saved to SQLite.
4. **Auto (Backtest):** The engine queries the SQLite graph to find related companies, checks the local CSV price cache (pulling from Yahoo if missing), and scores the price action.
5. **Auto (Train):** Scikit-Learn Logistic Regression trains on the results and saves a local `model.joblib` file.
6. **Auto (Chains):** The system generates the final trading signals and saves them to SQLite.
7. **Manual:** The UI polls the database and the user clicks to view the results.

### 6. Latency (If it ran live)
> *"If a real headline broke right now, how long... would it take to go from headline → displayed hypothesis?"*

**Estimated: 2 to 5 seconds.**
The bottleneck is entirely the Gemini LLM API request (1-4 seconds). The graph traversal, feature extraction, and Logistic Regression inference (`model.predict()`) take single-digit milliseconds. 
**However, this has never been tested end-to-end.** The system currently has zero mechanisms to receive a live webhook or live stream. It only knows how to process historical batches.

### 7. Environment
> *"Is any part of this deployed anywhere, or does everything only exist as code that runs locally?"*

**100% Local.**
Nothing is deployed to a server, cloud, or edge function. The entire platform consists of a local Vite/React dev server and a local Django `runserver` executing on a MacBook. 
