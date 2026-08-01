# Signal Chain

Signal Chain is an event-driven causal analysis platform. It classifies real news events, walks a company relationship graph, computes historical backtest hit rates, trains an explainable logistic regression model, and generates plain-English causal hypotheses using a Large Language Model (Gemini).

## What's New in V2?
The entire terminal-based ingestion and generation pipeline has been migrated to a fully integrated **browser UI**. You no longer need to run any terminal commands to ingest news, run backtests, train the model, or generate hypotheses. Everything is orchestrated from a single pipeline page with a real-time progress runner!

---

## 🚀 Quick Start Guide

You will need to run two separate terminal windows—one for the backend and one for the frontend.

### 1. Start the Backend Server (Django)
Open your first terminal and run the following commands:
```bash
cd backend
source .venv/bin/activate
# Install requirements if this is your first time: pip install -r requirements.txt
python manage.py runserver
```
*(The backend runs on http://localhost:8000 by default)*

### 2. Start the Frontend Server (React + Vite)
Open your second terminal and run:
```bash
cd frontend
# Install dependencies if this is your first time: npm install
npm run dev
```
*(The frontend runs on http://localhost:5173 by default)*

---

## 🔧 How to Use the App

1. **Open the App:** Navigate to `http://localhost:5173` in your browser.
2. **Setup your API Key:** 
   - Sign up or log in.
   - Go to the **Settings** page via the sidebar.
   - Enter your **Gemini API Key** (this is securely encrypted in the database) and click **Save Settings**.
   - *Optional:* You can use the "Test Connection" button to verify it works.
3. **Run the Pipeline:**
   - Go to the **Pipeline** page via the sidebar.
   - You can drag and drop your news data JSON file (e.g., `polygon_news_sample.json` located in `backend/data/`) into the upload zone.
   - You can adjust the ingestion limit for quicker testing or let it run on the entire file.
   - Click **Start Pipeline**.
4. **Watch it Work:** 
   The runner will automatically cascade through:
   - **Seed:** (Synchronizing graph nodes)
   - **Ingest:** (Classifying news with AI & matching companies)
   - **Backtest:** (Checking historical yfinance prices for real patterns)
   - **Train:** (Training an explainable confidence model based on the backtest)
   - **Chains:** (Generating causal hypotheses with Gemini)
   - **Verify:** (Running a system-wide smoke test)

Once finished, click **View Generated Chains** to browse the final research hypotheses!

---

## 📁 Repository Structure
* `/backend` - Django REST API, SQLite database, AI services, and pipeline job runner.
* `/frontend` - React 18, Vite, Tailwind CSS, providing the dashboard UI and pipeline runner.
* `SIGNAL_CHAIN_V2_PLAN.md` - The architecture and master plan that drove the V2 development.
