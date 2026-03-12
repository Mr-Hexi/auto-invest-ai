# Sequence Diagrams

## 1. Add Stock + Persist Analytics + Prediction
```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant F as Frontend (Stocks Page)
    participant API as Django API
    participant YF as Yahoo Finance (yfinance)
    participant DB as SQLite
    participant AN as Analytics Pipeline
    participant PR as Prediction Service

    U->>F: Click "Add Stock"
    F->>API: POST /api/portfolio/{id}/add-stock/
    API->>YF: fetch_live_stock_detail(symbol)
    YF-->>API: live quote + history + metadata
    API->>DB: upsert Stock
    API->>AN: generate_and_persist_stock_analytics(stock)
    AN->>YF: fetch 1Y history
    AN->>DB: upsert StockAnalytics
    API->>PR: refresh_stock_prediction(stock)
    PR->>YF: fetch 1Y Adj Close
    PR->>DB: update Stock prediction fields
    API-->>F: stock list payload
    F-->>U: Updated table with analytics + prediction
```

## 2. Portfolio Stocks Page Load
```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant F as Frontend (Stocks Page)
    participant API as Django API
    participant DB as SQLite

    U->>F: Open /stocks?portfolio={id}
    F->>API: GET /api/portfolio/
    F->>API: GET /api/stocks/?portfolio={id}
    API->>DB: read Portfolio + Stock + StockAnalytics + persisted prediction fields
    API-->>F: normalized stock list
    F-->>U: Render table + PE chart + prediction columns
```

## 3. Compare Stocks (Live, In-Memory Analysis)
```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant F as Frontend (Compare Page)
    participant API as Django API
    participant CL as Compare Service (yahoo_search.py)
    participant YF as Yahoo Finance (yfinance)

    U->>F: Select Stock A, Stock B and run comparison
    F->>API: GET /api/stocks/live-compare/?symbol_a=A&symbol_b=B&period=...
    API->>CL: fetch_live_stock_comparison(A, B)
    CL->>YF: download A history
    CL->>YF: download B history
    CL->>CL: Build DataFrames, align by date, drop NA
    CL->>CL: Compute Pearson + regression + y_fit
    CL-->>API: comparison payload
    API-->>F: historical + scatter + summary
    F-->>U: Render line chart, scatter, best-fit line, equation
```

## 4. Portfolio Clustering Analysis
```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant F as Frontend (Clusters Page)
    participant API as Django API
    participant CS as Cluster Service (cluster.py)
    participant Cache as Django Cache
    participant YF as Yahoo Finance (yfinance)
    participant DB as SQLite

    U->>F: Open /portfolio/clusters?portfolio={id}
    F->>API: GET /api/portfolio/{id}/clusters/?n_clusters=3
    API->>CS: build_portfolio_clusters(portfolio_id)
    CS->>DB: read portfolio stock symbols
    loop each symbol
        CS->>Cache: check cached history
        alt cache miss
            CS->>YF: download 1Y Adj Close
            CS->>Cache: cache history DataFrame/rows
        end
        CS->>CS: compute avg_return + volatility
    end
    CS->>CS: KMeans clustering + label interpretation
    CS-->>API: rows + centroids + cluster summary
    API-->>F: clustering payload
    F-->>U: Render risk-return scatter + summary + assignment table
```

## 5. Authentication Flow
```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant F as Frontend (Login/Register)
    participant API as Django API
    participant DB as SQLite

    U->>F: Register/Login
    F->>API: POST /api/register or /api/login
    API->>DB: create/find user + token
    API-->>F: user + auth token
    F-->>U: Store token and unlock protected routes
```
