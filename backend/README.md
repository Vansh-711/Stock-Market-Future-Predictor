# Backend setup

pip install -r requirements.txt --break-system-packages
python manage.py migrate
python manage.py createsuperuser   # optional, for /admin/ data entry
python manage.py runserver         # http://localhost:8000

## Data pipeline order (after seeding companies + relationships via /admin/)
1. Load your news dataset -> create NewsEvent rows (write a small loader script
   in market/management/commands/ that reads the Kaggle CSV and bulk-creates them)
2. python manage.py run_backtest      # computes BacktestPattern stats
3. python manage.py train_model       # trains the logistic regression, writes metrics.json

## Key endpoints
GET  /api/v1/market/companies/
GET  /api/v1/market/relationships/
GET  /api/v1/market/events/?symbol=AAPL
GET  /api/v1/market/patterns/            <- your validated historical patterns
GET  /api/v1/market/chains/?symbol=AAPL  <- generated causal chains
GET  /api/v1/market/graph/               <- {nodes, edges} for the relationship graph view
POST /api/v1/auth/signup/  {username, email, password}
POST /api/v1/auth/login/   {username, password}
POST /api/v1/auth/logout/
GET  /api/v1/auth/me/
