import { useLocation, useNavigate } from "react-router-dom";
import OpportunityBadge from "./OpportunityBadge";
import { currencyCodeFromItem, formatMoney } from "../utils/currency";

export default function StockTable({ stocks, onDeleteStock, deletingStockId }) {
  const navigate = useNavigate();
  const location = useLocation();

  const statusLabel = (stock) => {
    if (stock.prediction_status === "insufficient_data") {
      return "Insufficient Data";
    }
    return "Unavailable";
  };

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
        <span title="Prediction based on 1-year linear trend. For informational purposes only.">
          Prediction based on 1-year linear trend. For informational purposes only.
        </span>
      </div>
      <div className="max-h-[68vh] overflow-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Symbol</th>
              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Company Name</th>
              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Current Price</th>
              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Min Price</th>
              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Max Price</th>
              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Predicted (1D)</th>
              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">% Change</th>
              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">Signal</th>
              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Confidence (R2)</th>
              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">PE Ratio</th>
              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">Discount Level</th>
              <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {stocks.map((stock, index) => (
              <tr
                key={stock.id ?? stock.symbol}
                className={`${stock.id || stock.is_live ? "cursor-pointer hover:bg-brand-50" : "cursor-default"} ${index % 2 === 0 ? "bg-white" : "bg-slate-50/60"} transition`}
                onClick={() => {
                  if (stock.id) {
                    navigate(`/stocks/${stock.id}`, {
                      state: { from: `${location.pathname}${location.search}` },
                    });
                  } else if (stock.is_live && stock.symbol) {
                    navigate(`/stocks/live/${encodeURIComponent(stock.symbol)}`, {
                      state: { from: `${location.pathname}${location.search}` },
                    });
                  }
                }}
              >
                <td className="px-4 py-3 text-sm font-semibold text-slate-900">{stock.symbol}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{stock.company_name}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">
                  {formatMoney(stock.current_price, currencyCodeFromItem(stock))}
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">
                  {formatMoney(stock.min_price, currencyCodeFromItem(stock))}
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">
                  {formatMoney(stock.max_price, currencyCodeFromItem(stock))}
                </td>
                <td className="bg-indigo-50/55 px-4 py-3 text-right text-sm font-semibold text-indigo-900">
                  {stock.prediction_status === "ok"
                    ? formatMoney(stock.predicted_price_1d, currencyCodeFromItem(stock))
                    : statusLabel(stock)}
                </td>
                <td
                  className={`px-4 py-3 text-right text-sm font-semibold ${
                    stock.prediction_status !== "ok"
                      ? "bg-slate-100 text-slate-500"
                      : Number(stock.expected_change_pct || 0) >= 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {stock.prediction_status === "ok"
                    ? `${Number(stock.expected_change_pct || 0).toFixed(2)}%`
                    : statusLabel(stock)}
                </td>
                <td className="bg-slate-100/80 px-4 py-3 text-center text-sm">
                  <span
                    className={
                      stock.prediction_status !== "ok"
                        ? "text-slate-500"
                        : stock.direction_signal?.includes("Increase")
                          ? "font-semibold text-emerald-700"
                          : "font-semibold text-rose-700"
                    }
                  >
                    {stock.prediction_status === "ok" ? stock.direction_signal : statusLabel(stock)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">
                  {stock.prediction_status === "ok"
                    ? Number(stock.model_confidence_r2 || 0).toFixed(2)
                    : statusLabel(stock)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">{stock.pe_ratio ?? "-"}</td>
                <td className="px-4 py-3 text-center">
                  <OpportunityBadge level={stock.discount_level} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    disabled={!stock.id || deletingStockId === stock.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (stock.id && onDeleteStock) {
                        onDeleteStock(stock.id, stock.symbol);
                      }
                    }}
                  >
                    {deletingStockId === stock.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
