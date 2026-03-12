import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Loader from "../components/Loader";
import OpportunityBadge from "../components/OpportunityBadge";
import StockCard from "../components/StockCard";
import { fetchStockById } from "../api/stocks";
import { currencyCodeFromItem, formatMoney } from "../utils/currency";

export default function StockDetail() {
  const { id } = useParams();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStock = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchStockById(id);
        setStock(data);
      } catch {
        setError("Failed to load stock details.");
      } finally {
        setLoading(false);
      }
    };

    loadStock();
  }, [id]);

  const chartData = useMemo(() => {
    const graph = stock?.analytics?.graph_data;
    const dates = graph?.dates || [];
    const prices = graph?.price || [];
    const movingAvg = graph?.moving_avg || [];

    return dates.map((date, index) => ({
      date,
      price: prices[index],
      moving_avg: movingAvg[index],
    }));
  }, [stock]);

  if (loading) {
    return (
      <div className="card p-6">
        <Loader />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  }

  if (!stock) {
    return <div className="card p-6 text-sm text-slate-500">Stock not found.</div>;
  }

  const backPortfolioQuery = stock.portfolio ? `?portfolio=${stock.portfolio}` : "";
  const currencyCode = currencyCodeFromItem(stock);
  const predictionLabel =
    stock.prediction_status === "insufficient_data"
      ? "Insufficient Data"
      : "Unavailable";

  return (
    <section className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Stock Analytics</h1>
        <Link to={`/stocks${backPortfolioQuery}`} className="btn-secondary">
          Back to Stocks
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <StockCard stock={{ ...stock, discount_level: stock.analytics?.discount_level }} />
        </div>

        <div className="space-y-5 lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Price Snapshot</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Current Price</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{formatMoney(stock.current_price, currencyCode)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Min Price</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{formatMoney(stock.min_price, currencyCode)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Max Price</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{formatMoney(stock.max_price, currencyCode)}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Prediction (1D)</h2>
            <p
              className="mt-1 text-xs text-slate-500"
              title="Prediction based on 1-year linear trend. For informational purposes only."
            >
              Prediction based on 1-year linear trend. For informational purposes only.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Predicted (1D)</p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {stock.prediction_status === "ok"
                    ? formatMoney(stock.predicted_price_1d, currencyCode)
                    : predictionLabel}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">% Change</p>
                <p
                  className={`mt-2 text-xl font-bold ${stock.prediction_status !== "ok"
                    ? "text-slate-900"
                    : Number(stock.expected_change_pct || 0) >= 0
                      ? "text-emerald-700"
                      : "text-rose-700"
                    }`}
                >
                  {stock.prediction_status === "ok"
                    ? `${Number(stock.expected_change_pct || 0).toFixed(2)}%`
                    : predictionLabel}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Signal</p>
                <p
                  className={`mt-2 text-xl font-bold ${stock.prediction_status !== "ok"
                    ? "text-slate-900"
                    : stock.direction_signal?.includes("Increase")
                      ? "text-emerald-700"
                      : "text-rose-700"
                    }`}
                >
                  {stock.prediction_status === "ok" ? stock.direction_signal : predictionLabel}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Confidence (R2)</p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {stock.prediction_status === "ok"
                    ? Number(stock.model_confidence_r2 || 0).toFixed(2)
                    : predictionLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">PE Ratio</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{stock.analytics?.pe_ratio ?? "-"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Discount Level</p>
                <div className="mt-2">
                  <OpportunityBadge level={stock.analytics?.discount_level} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Opportunity Score</p>
                <p className="mt-2 text-xl font-bold text-brand-900">{stock.analytics?.opportunity_score ?? "-"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border border-slate-200 p-6 shadow-md">
        <h2 className="text-lg font-semibold text-slate-900">Opportunity Graph</h2>
        <div className="mt-4 h-[440px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.7} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} name="Price" />
              <Line
                type="monotone"
                dataKey="moving_avg"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
                name="Moving Avg"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
