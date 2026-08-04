# Frontend Architecture Reality Check

This document outlines the exact technical shape of the Signal Chain React frontend as it exists right now, today. No aspirations, just the bare metal implementation.

### 1. Data Fetching Pattern
> *"How does the React frontend currently get data from Django?"*

**Manual fetching and aggressive short-polling.**
There is no sophisticated caching layer or streaming. For static data (like the graph health stats or the list of chains), it does a one-time HTTP `fetch` on component mount. 
For pipeline execution, the frontend uses an aggressive **short-polling** loop. When a job starts, it uses `window.setInterval` to blindly hit the `/api/pipeline/latest/` endpoint every 1,200 milliseconds until the job status returns as `completed` or `failed`.

### 2. State Management
> *"What's managing state on the frontend?"*

**Plain React State (`useState` / `useEffect`).**
There is no Redux, no Zustand, and no React Query or SWR. API calls are managed by a custom, barebones `useRemoteData.ts` hook that simply wraps standard promises in `useState` to track `loading`, `success`, and `error` states. Adding live, optimistic updates or complex global state management here will require manual prop-drilling or Context refactoring, as there is no global store to intercept live events.

### 3. Real-Time Capability
> *"Is there any WebSocket, Server-Sent Events, or long-polling set up anywhere currently?"*

**None.**
Zero WebSockets. Zero Server-Sent Events (SSE). Zero long-polling. Every single interaction in the entire application is strictly `Request -> Response -> Done`. The "live" pipeline logs you see in the UI are just the result of hitting the REST API every 1.2 seconds and completely replacing the old log array in local state with the new one.

### 4. UI Structure for Results
> *"Walk me through the current screens/components... Does it currently have any concept of 'new' vs 'old' results?"*

The results structure is entirely static and batch-oriented. 
There is a `ChainsListPage` (grid of cards) and a `ChainDetailPage` (deep dive into a specific hypothesis). 
**There is absolutely no concept of "new" vs "old" data.** When a batch job finishes, the user navigates to the list page, and it just fetches `SELECT * FROM chains ORDER BY confidence`. It replaces the entire screen. There is no concept of a "feed," no "new signals just arrived" banner, and no timestamp-based highlighting. 

### 5. Loading/Status States
> *"Right now, when the user clicks 'Start,' how does the UI know the batch job is running vs finished vs failed?"*

The UI does not block or spin on the initial HTTP request. It uses an async worker pattern:
1. User clicks "Start" -> HTTP POST is sent.
2. Django immediately returns a `job_id` with `status="running"`.
3. The frontend catches that `job_id` and kicks off the 1.2-second polling loop. 
4. The backend updates the database row with `progress_percent` and `current_step`.
5. The frontend reads these fields every 1.2s and animates the progress bar accordingly.

### 6. Historical vs. Anything-Else Distinction
> *"Does the UI currently have any visual distinction for data source, confidence level, or 'is this validated'?"*

**No distinction for data source.** 
Every causal chain is rendered identically. The UI has rich visualizations for the ML model's confidence percentage and historical hit rate, but it cannot visually differentiate between a chain generated from a 2023 backtest CSV and a theoretical chain generated live today. To the UI, a chain is just a chain.

### 7. Notification Capability
> *"Is there anything in place for telling the user 'something happened' without them manually refreshing?"*

**A basic Toast library.**
There is a very simple `useToast()` hook that triggers small success/error popups in the corner of the screen (e.g., "Pipeline queued successfully" or "Failed to clear data"). However, because there are no WebSockets, the server cannot push a toast to the user. A toast can only be triggered by the user taking an action or the polling loop catching a change. 
