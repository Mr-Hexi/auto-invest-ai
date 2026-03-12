# Auto Invest AI

Full-stack stock portfolio analytics platform with live market integration, prediction, stock comparison, and risk-return clustering.

## Tech Stack
- Backend: Django, Django REST Framework, SQLite
- Frontend: React (Vite), Tailwind CSS, Recharts
- Market Data: `yfinance`
- Data Science: `pandas`, `scikit-learn`

## Features
- Token-based authentication (`register`, `login`)
- Portfolio creation and stock management
- Add/remove stocks from portfolio
- Live stock search and stock detail view
- Stock analytics (PE ratio, discount level, opportunity score)
- 1-day stock prediction (linear trend model)
- Compare two stocks (historical, scatter, correlation, best-fit regression)
- Portfolio risk-return clustering with K-Means
- Price Prediction page (XGBoost/LSTM, historical period/frequency controls, plot outputs, request caching)
- Dynamic currency display (USD/INR based on ticker/currency)

## Project Structure
```text
auto_invest_AI/
|-- backend/
|   |-- api/                       # DRF viewsets, serializers, routes
|   |-- analytics/
|   |   |-- services/
|   |   |   |-- yahoo_search.py    # live search/detail/compare (yfinance)
|   |   |   |-- prediction.py      # 1-day prediction + caching
|   |   |   |-- price_prediction.py # XGBoost/LSTM prediction pipeline + plot generation
|   |   |   |-- cluster.py         # risk-return clustering
|   |   |   `-- pipeline.py        # analytics generation + persistence
|   |-- portfolio/                 # Portfolio/Stock models
|   `-- manage.py
|-- frontend/
|   |-- src/pages/                 # Portfolio, Stocks, Compare, Clusters, etc.
|   |-- src/components/
|   `-- src/api/stocks.js
`-- docs/
    `-- SEQUENCE_DIAGRAM.md
```

## Database Models
- `Portfolio`
  - `name`, `description`
- `Stock`
  - `portfolio`, `symbol`, `company_name`, `sector`, `current_price`
  - prediction fields:
    `predicted_price_1d`, `expected_change_pct`, `direction_signal`,
    `model_confidence_r2`, `prediction_status`, `recommended_action`,
    `prediction_updated_at`
- `StockAnalytics`
  - `stock` (OneToOne), `pe_ratio`, `discount_level`, `opportunity_score`, `graph_data`, `last_updated`
- `PredictionResultCache`
  - `stock_symbol`, `model_type`, `prediction_frequency`, `historical_period`, `generated_at`, `forecast_data`, `plots_path`
- `PredictionModelState`
  - `model_type`, `last_trained_at`

## Setup
### Prerequisites
- Python 3.11+
- Node.js 18+
- Conda environment (recommended): `vibe-env`

### Backend
```powershell
cd backend
conda run -n vibe-env pip install -r requirements.txt
conda run -n vibe-env pip install -r requirements-prediction.txt
conda run -n vibe-env python manage.py migrate
conda run -n vibe-env python manage.py runserver
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

Frontend default: `http://localhost:5173`  
Backend default: `http://127.0.0.1:8000`

## API Endpoints
### Auth
- `POST /api/register/`
- `POST /api/login/`

### Portfolio
- `GET /api/portfolio/`
- `POST /api/portfolio/`
- `POST /api/portfolio/{id}/add-stock/`
- `GET /api/portfolio/{id}/clusters/`

### Stocks
- `GET /api/stocks/?portfolio={id}`
- `GET /api/stocks/{id}/`
- `DELETE /api/stocks/{id}/remove/`
- `GET /api/stocks/live-search/?q={query}&limit={n}`
- `GET /api/stocks/live-detail/?symbol={symbol}&period={period}&interval={interval}`
- `GET /api/stocks/live-compare/?symbol_a={A}&symbol_b={B}&period={period}&interval={interval}`

### Price Prediction
- `GET /api/prediction/`
- `POST /api/prediction/run/`

## Main Runtime Flows
1. User logs in and receives token.
2. User creates/selects portfolio.
3. User adds stock:
   - Backend fetches live data from `yfinance`.
   - `Stock` row is created/updated.
   - Analytics pipeline persists `StockAnalytics`.
   - Prediction service computes and saves model outputs into `Stock`.
4. Stocks table renders persisted analytics + prediction fields.
5. Compare page fetches live comparison payload (in-memory DataFrame analysis).
6. Clusters page fetches portfolio cluster analysis (risk-return K-Means).

## Management Commands
- Run analytics and refresh predictions for all stocks:
```powershell
cd backend
conda run -n vibe-env python manage.py run_analytics
```
- Warm model outputs (for cron/celery scheduling):
```powershell
cd backend
conda run -n vibe-env python manage.py run_prediction_maintenance --model xgboost --symbols AAPL TSLA BTC-USD
conda run -n vibe-env python manage.py run_prediction_maintenance --model lstm --symbols AAPL TSLA BTC-USD
```

## Notes
- Predictions use a 1-year linear trend model and are informational only.
- New prediction artifacts are saved under `/predictions/{stock}/{model}/`.
- Cache policy: identical request signature returns cached data if generated in the last 24 hours.
- Suggested scheduler cadence:
  - XGBoost maintenance: every 24 hours
  - LSTM maintenance: every 3 days
- Caching is used to limit repeated API/model computation calls.
- Clustering gracefully handles empty/insufficient data scenarios.

## Sequence Diagram
See: [SEQUENCE_DIAGRAM.md](/C:/Huzaifa/bizz_python/ML/PROJECTS/BizMetric/GENAI_FSD/auto_invest_AI/docs/SEQUENCE_DIAGRAM.md)
