from __future__ import annotations

from typing import Any
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf

from analytics.services.opportunity_engine import opportunity_engine


ALLOWED_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "3y", "5y", "10y", "max"}
ALLOWED_INTERVALS = {"1d", "1wk", "1mo"}
DATAFRAME_DIR = Path(__file__).resolve().parents[1] / "dataframes"


def _discount_level(min_price: float, max_price: float, current_price: float) -> str:
    if max_price <= min_price:
        return "MEDIUM"
    price_position = (current_price - min_price) / (max_price - min_price)
    if price_position <= 0.33:
        return "HIGH"
    if price_position <= 0.66:
        return "MEDIUM"
    return "LOW"


def _normalize_period(period: str | None) -> str:
    value = (period or "1y").strip().lower()
    return value if value in ALLOWED_PERIODS else "1y"


def _normalize_interval(interval: str | None) -> str:
    value = (interval or "1d").strip().lower()
    return value if value in ALLOWED_INTERVALS else "1d"


def _infer_currency(symbol: str, reported_currency: str | None = None) -> str:
    if reported_currency:
        return str(reported_currency).upper()
    symbol_upper = str(symbol or "").upper()
    if symbol_upper.endswith(".NS") or symbol_upper.endswith(".BO"):
        return "INR"
    return "USD"


def _sanitize_symbol(symbol: str) -> str:
    text = str(symbol or "").upper()
    return "".join(ch if ch.isalnum() else "_" for ch in text).strip("_") or "UNKNOWN"


def _extract_prices(history):
    if "Adj Close" in history.columns:
        series = history["Adj Close"].dropna()
        if not series.empty:
            return series
    if "Close" in history.columns:
        return history["Close"].dropna()
    return history.iloc[:, 0].dropna()


def _compute_regression(df: pd.DataFrame, x_col: str = "x", y_col: str = "y") -> dict[str, float]:
    frame = df[[x_col, y_col]].dropna()
    n = len(frame)
    if n < 2:
        return {"slope": 0.0, "intercept": 0.0, "correlation": 0.0}

    sum_x = float(frame[x_col].sum())
    sum_y = float(frame[y_col].sum())
    sum_xy = float((frame[x_col] * frame[y_col]).sum())
    sum_x2 = float((frame[x_col] * frame[x_col]).sum())
    sum_y2 = float((frame[y_col] * frame[y_col]).sum())

    denominator = (n * sum_x2) - (sum_x * sum_x)
    slope = 0.0 if denominator == 0 else ((n * sum_xy) - (sum_x * sum_y)) / denominator
    intercept = (sum_y - (slope * sum_x)) / n

    corr_numerator = (n * sum_xy) - (sum_x * sum_y)
    corr_denominator = (((n * sum_x2) - (sum_x * sum_x)) * ((n * sum_y2) - (sum_y * sum_y))) ** 0.5
    correlation = 0.0 if corr_denominator == 0 else corr_numerator / corr_denominator

    return {"slope": slope, "intercept": intercept, "correlation": correlation}


def _aligned_price_frame(stock_a: dict[str, Any], stock_b: dict[str, Any]) -> pd.DataFrame:
    frame_a = pd.DataFrame({"date": stock_a["dates"], "price_a": stock_a["prices"]})
    frame_b = pd.DataFrame({"date": stock_b["dates"], "price_b": stock_b["prices"]})
    merged = frame_a.merge(frame_b, on="date", how="inner").dropna(subset=["price_a", "price_b"])
    if merged.empty:
        return merged
    return merged.sort_values("date").reset_index(drop=True)


def _save_comparison_dataframes(
    stock_a: dict[str, Any],
    stock_b: dict[str, Any],
    aligned_df: pd.DataFrame,
    period: str,
    interval: str,
) -> None:
    DATAFRAME_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    symbol_a = _sanitize_symbol(stock_a["symbol"])
    symbol_b = _sanitize_symbol(stock_b["symbol"])
    prefix = f"{symbol_a}_{symbol_b}_{period}_{interval}_{timestamp}"

    stock_a_df = pd.DataFrame({"date": stock_a["dates"], "price": stock_a["prices"]})
    stock_b_df = pd.DataFrame({"date": stock_b["dates"], "price": stock_b["prices"]})

    stock_a_df.to_csv(DATAFRAME_DIR / f"{prefix}_stock_a.csv", index=False)
    stock_b_df.to_csv(DATAFRAME_DIR / f"{prefix}_stock_b.csv", index=False)
    aligned_df.to_csv(DATAFRAME_DIR / f"{prefix}_aligned.csv", index=False)


def _fetch_ticker_payload(symbol: str, period: str, interval: str) -> dict[str, Any]:
    ticker = yf.Ticker(symbol)
    history = ticker.history(period=period, interval=interval)
    if history.empty:
        raise ValueError(f"No data found for ticker: {symbol}")

    closes = _extract_prices(history)
    if closes.empty:
        raise ValueError(f"No price data available for ticker: {symbol}")

    dates = [idx.strftime("%Y-%m-%d") for idx in closes.index]
    prices = [round(float(value), 4) for value in closes.tolist()]
    current_price = prices[-1]
    min_price = min(prices)
    max_price = max(prices)
    moving_avg = [
        round(float(closes.iloc[max(0, i - 4): i + 1].mean()), 4)
        for i in range(len(closes))
    ]

    info = {}
    try:
        info = ticker.info or {}
    except Exception:
        info = {}

    pe_ratio = info.get("trailingPE") or info.get("forwardPE")
    company_name = info.get("shortName") or info.get("longName") or symbol
    currency = _infer_currency(symbol, info.get("currency"))

    return {
        "symbol": symbol,
        "company_name": company_name,
        "currency": currency,
        "pe_ratio": round(float(pe_ratio), 2) if pe_ratio is not None else None,
        "current_price": round(current_price, 2),
        "min_price": round(min_price, 2),
        "max_price": round(max_price, 2),
        "today_price": round(current_price, 2),
        "dates": dates,
        "prices": prices,
        "moving_avg": moving_avg,
        "price_map": {dates[index]: prices[index] for index in range(len(dates))},
    }


def search_live_stocks(query: str, limit: int = 10) -> list[dict[str, Any]]:
    """
    Search worldwide stocks from Yahoo Finance and return normalized rows
    compatible with stock list table fields.
    """
    if not query.strip():
        return []

    candidates: list[dict[str, str]] = []
    try:
        search = yf.Search(query, max_results=limit)
        quotes = getattr(search, "quotes", []) or []
        for quote in quotes:
            symbol = quote.get("symbol")
            if not symbol:
                continue
            quote_type = quote.get("quoteType")
            if quote_type and str(quote_type).upper() != "EQUITY":
                continue
            company_name = (
                quote.get("shortname")
                or quote.get("longname")
                or quote.get("displayName")
                or symbol
            )
            candidates.append({"symbol": symbol, "company_name": company_name})
            if len(candidates) >= limit:
                break
    except Exception:
        candidates = []

    if not candidates:
        candidates = [{"symbol": query.upper(), "company_name": query.upper()}]

    results: list[dict[str, Any]] = []
    for candidate in candidates[:limit]:
        symbol = candidate["symbol"]
        try:
            ticker = yf.Ticker(symbol)
            history = ticker.history(period="1y", interval="1d")
            if history.empty:
                continue

            closes = history["Close"].dropna()
            if closes.empty:
                continue

            min_price = round(float(closes.min()), 2)
            max_price = round(float(closes.max()), 2)
            closing_price = round(float(closes.iloc[-1]), 2)

            pe_ratio = None
            company_name = candidate["company_name"]
            currency = None
            try:
                info = ticker.info or {}
                pe_ratio = info.get("trailingPE") or info.get("forwardPE")
                company_name = info.get("shortName") or info.get("longName") or company_name
                currency = info.get("currency")
            except Exception:
                pass

            pe_ratio_value = round(float(pe_ratio), 2) if pe_ratio is not None else None
            results.append(
                {
                    "id": None,
                    "symbol": symbol,
                    "company_name": company_name,
                    "current_price": closing_price,
                    "min_price": min_price,
                    "max_price": max_price,
                    "closing_price": closing_price,
                    "pe_ratio": pe_ratio_value,
                    "currency": _infer_currency(symbol, currency),
                    "discount_level": _discount_level(
                        min_price=min_price,
                        max_price=max_price,
                        current_price=closing_price,
                    ),
                    "is_live": True,
                }
            )
        except Exception:
            continue

    return results


def fetch_live_stock_detail(
    symbol: str,
    period: str = "1y",
    interval: str = "1d",
) -> dict[str, Any] | None:
    """
    Fetch one live stock detail from Yahoo Finance and return payload
    compatible with local StockDetail response shape.
    """
    ticker_symbol = symbol.strip().upper()
    if not ticker_symbol:
        return None

    normalized_period = _normalize_period(period)
    normalized_interval = _normalize_interval(interval)

    try:
        payload = _fetch_ticker_payload(
            symbol=ticker_symbol,
            period=normalized_period,
            interval=normalized_interval,
        )
        price_df = pd.DataFrame(
            {
                "date": payload["dates"],
                "price": payload["prices"],
                "moving_avg": payload["moving_avg"],
            }
        ).dropna(subset=["price"])
        if price_df.empty:
            return None

        prices = [round(float(value), 4) for value in price_df["price"].tolist()]
        moving_avg = [round(float(value), 4) for value in price_df["moving_avg"].tolist()]
        current_price = float(price_df["price"].iloc[-1])
        min_price = float(price_df["price"].min())
        max_price = float(price_df["price"].max())
        discount_level = _discount_level(min_price=min_price, max_price=max_price, current_price=current_price)
        pe_ratio = payload["pe_ratio"]
        pe_value = pe_ratio if pe_ratio is not None else 0.0
        opportunity_score = opportunity_engine(pe_ratio=pe_value, discount_level=discount_level)

        return {
            "id": None,
            "portfolio": None,
            "portfolio_name": "Global Search",
            "symbol": ticker_symbol,
            "company_name": payload["company_name"],
            "sector": "Global",
            "currency": payload["currency"],
            "current_price": current_price,
            "min_price": round(min_price, 2),
            "max_price": round(max_price, 2),
            "today_price": round(current_price, 2),
            "is_live": True,
            "analytics": {
                "pe_ratio": pe_ratio,
                "discount_level": discount_level,
                "opportunity_score": opportunity_score,
                "graph_data": {
                    "dates": [str(value) for value in price_df["date"].tolist()],
                    "price": prices,
                    "moving_avg": moving_avg,
                    "period": normalized_period,
                    "interval": normalized_interval,
                },
                "last_updated": datetime.now(timezone.utc).isoformat(),
            },
        }
    except Exception:
        return None


def fetch_live_stock_comparison(
    symbol_a: str,
    symbol_b: str,
    period: str = "5y",
    interval: str = "1d",
) -> dict[str, Any]:
    ticker_a = symbol_a.strip().upper()
    ticker_b = symbol_b.strip().upper()
    if not ticker_a or not ticker_b:
        raise ValueError("Both stock symbols are required.")
    if ticker_a == ticker_b:
        raise ValueError("Please select two different stocks.")

    normalized_period = _normalize_period(period or "5y")
    normalized_interval = _normalize_interval(interval)

    try:
        stock_a = _fetch_ticker_payload(ticker_a, normalized_period, normalized_interval)
        stock_b = _fetch_ticker_payload(ticker_b, normalized_period, normalized_interval)
    except ValueError:
        raise
    except Exception as exc:
        raise RuntimeError("Unable to fetch stock data from Yahoo Finance.") from exc

    aligned_df = _aligned_price_frame(stock_a, stock_b)
    _save_comparison_dataframes(
        stock_a=stock_a,
        stock_b=stock_b,
        aligned_df=aligned_df,
        period=normalized_period,
        interval=normalized_interval,
    )
    historical = [
        {
            "date": str(row.date),
            "price_a": round(float(row.price_a), 4),
            "price_b": round(float(row.price_b), 4),
        }
        for row in aligned_df.itertuples(index=False)
    ]

    if len(historical) < 2:
        raise ValueError("Not enough overlapping data to compare selected stocks.")

    points_df = aligned_df.rename(columns={"price_a": "x", "price_b": "y"})
    regression = _compute_regression(points_df)
    points = points_df[["date", "x", "y"]].copy()
    points["y_fit"] = (regression["slope"] * points["x"]) + regression["intercept"]
    scatter = [
        {
            "date": str(row.date),
            "x": float(row.x),
            "y": float(row.y),
            "y_fit": round(float(row.y_fit), 6),
        }
        for row in points.sort_values("x").itertuples(index=False)
    ]

    slope = regression["slope"]
    intercept = regression["intercept"]
    equation = f"{ticker_b} = {slope:.6f} * {ticker_a} + {intercept:.6f}"

    return {
        "period": normalized_period,
        "interval": normalized_interval,
        "stock_a": {
            "symbol": stock_a["symbol"],
            "company_name": stock_a["company_name"],
            "currency": stock_a["currency"],
            "current_price": stock_a["current_price"],
            "min_price": stock_a["min_price"],
            "max_price": stock_a["max_price"],
            "today_price": stock_a["today_price"],
            "pe_ratio": stock_a["pe_ratio"],
        },
        "stock_b": {
            "symbol": stock_b["symbol"],
            "company_name": stock_b["company_name"],
            "currency": stock_b["currency"],
            "current_price": stock_b["current_price"],
            "min_price": stock_b["min_price"],
            "max_price": stock_b["max_price"],
            "today_price": stock_b["today_price"],
            "pe_ratio": stock_b["pe_ratio"],
        },
        "historical": historical,
        "scatter": scatter,
        "pearson_correlation": round(regression["correlation"], 6),
        "regression": {
            "slope": round(slope, 6),
            "intercept": round(intercept, 6),
            "equation": equation,
        },
    }
