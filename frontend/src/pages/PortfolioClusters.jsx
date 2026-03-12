import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Loader from "../components/Loader";
import { fetchPortfolio, fetchPortfolioClusters } from "../api/stocks";

const ACTIVE_PORTFOLIO_KEY = "active_portfolio_id";
const CLUSTER_COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0f766e"];
const CLUSTER_MEANINGS = [
  { label: "Uptrend Leaders", description: "Strong momentum with supportive trend behavior." },
  { label: "Possible Rebound", description: "Oversold profile with recovery potential." },
  { label: "Stable Stocks", description: "Lower volatility and steadier return profile." },
  { label: "Weak Stocks", description: "Lower trend strength and weaker momentum profile." },
];

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "-";
  }
  return `${(Number(value) * 100).toFixed(2)}%`;
}

function formatDecimal(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "-";
  }
  return Number(value).toFixed(4);
}

export default function PortfolioClusters() {
  const [searchParams] = useSearchParams();
  const { id: routePortfolioId } = useParams();
  const navigate = useNavigate();
  const queryPortfolioId = searchParams.get("portfolio");
  const fallbackPortfolioId = sessionStorage.getItem(ACTIVE_PORTFOLIO_KEY);
  const portfolioId = routePortfolioId || queryPortfolioId || fallbackPortfolioId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [portfolios, setPortfolios] = useState([]);
  const [clusterData, setClusterData] = useState(null);
  const [loadingStep, setLoadingStep] = useState("Analyzing portfolio...");

  const selectedPortfolio = useMemo(
    () => portfolios.find((item) => String(item.id) === String(portfolioId)) || null,
    [portfolios, portfolioId]
  );

  useEffect(() => {
    if (!portfolioId) {
      navigate("/portfolio?notice=select-portfolio", { replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      setMessage("");
      setLoadingStep("Analyzing portfolio...");
      const stepTexts = [
        "Analyzing portfolio...",
        "Computing factors...",
        "Generating clusters...",
      ];
      let stepIndex = 0;
      const stepTimer = window.setInterval(() => {
        stepIndex = (stepIndex + 1) % stepTexts.length;
        setLoadingStep(stepTexts[stepIndex]);
      }, 900);
      try {
        const [portfolioRows, clusters] = await Promise.all([
          fetchPortfolio(),
          fetchPortfolioClusters(portfolioId, 4),
        ]);
        const normalizedPortfolios = Array.isArray(portfolioRows) ? portfolioRows : [];
        const portfolioExists = normalizedPortfolios.some(
          (item) => String(item.id) === String(portfolioId)
        );
        if (!portfolioExists) {
          navigate("/portfolio?notice=select-portfolio", { replace: true });
          return;
        }

        sessionStorage.setItem(ACTIVE_PORTFOLIO_KEY, String(portfolioId));
        setPortfolios(normalizedPortfolios);
        setClusterData(clusters);
        if (clusters?.status !== "ok") {
          setMessage(clusters?.detail || "Clustering analysis unavailable.");
        }
      } catch (err) {
        if (err?.code === "ECONNABORTED") {
          setError("Clustering analysis is taking longer than expected. Please try again.");
        } else {
          setError(err?.response?.data?.detail || "Failed to load clustering analysis.");
        }
      } finally {
        window.clearInterval(stepTimer);
        setLoading(false);
      }
    };

    load();
  }, [navigate, portfolioId]);

  const scatterGroups = useMemo(() => {
    const rows = clusterData?.features || [];
    const map = new Map();
    rows.forEach((row) => {
      const key = Number(row.cluster);
      const bucket = map.get(key) || [];
      bucket.push({
        ...row,
        x: Number(row.umap_x),
        y: Number(row.umap_y),
      });
      map.set(key, bucket);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [clusterData]);

  const renderScatterTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }
    const point = payload[0]?.payload;
    if (!point) {
      return null;
    }

    return (
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow">
        <p className="font-semibold text-slate-900">{point.stock || "-"}</p>
        <p className="text-slate-700">{point.cluster_label || "-"}</p>
        <p className="text-slate-600">Momentum: {formatPercent(point.momentum)}</p>
        <p className="text-slate-600">Volatility: {formatPercent(point.volatility)}</p>
        <p className="text-slate-600">UMAP X: {Number(point.x).toFixed(4)}</p>
        <p className="text-slate-600">UMAP Y: {Number(point.y).toFixed(4)}</p>
      </div>
    );
  };

  const stats = useMemo(() => {
    const rows = clusterData?.features || [];
    const clusterCount = new Set(rows.map((row) => row.cluster)).size;
    return {
      stockCount: rows.length,
      clusterCount,
      featureCount: 6,
    };
  }, [clusterData]);

  if (loading) {
    return (
      <div className="card p-6">
        <Loader />
        <p className="mt-3 text-center text-sm text-slate-600">{loadingStep}</p>
      </div>
    );
  }

  return (
    <section className="space-y-10">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Portfolio</p>
            <h1 className="text-2xl font-bold text-slate-900">Clustering Analysis</h1>
            <p className="mt-1 text-sm text-slate-600">
              {selectedPortfolio?.name || "Portfolio"} - Factor-based opportunity clusters
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/stocks?portfolio=${portfolioId}`} className="btn-secondary">
              Back to Stocks
            </Link>
            <Link to="/portfolio" className="btn-secondary">
              All Portfolios
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Stocks Used</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{stats.stockCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Clusters</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{stats.clusterCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Factors</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{stats.featureCount}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Analysis Output</h2>
          <p className="mt-1 text-sm text-slate-600">UMAP projection + KMeans segmentation.</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {message && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{message}</div>}

      {clusterData?.status !== "ok" && !error && (
        <div className="card p-6 text-sm text-slate-700">
          Clustering could not be generated for this portfolio right now.
          <div className="mt-2 text-slate-500">
            Try adding more stocks or stocks with longer trading history, then retry.
          </div>
        </div>
      )}

      {clusterData?.status === "ok" && (
        <>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">UMAP Cluster Scatter</h2>
            <p className="mt-1 text-sm text-slate-600">X/Y coordinates are UMAP embeddings of factor features.</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-4">
              <div className="h-[430px] lg:col-span-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 16, left: 12, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.7} />
                    <XAxis type="number" dataKey="x" name="UMAP X" />
                    <YAxis type="number" dataKey="y" name="UMAP Y" width={76} />
                    <Tooltip content={renderScatterTooltip} />
                    {scatterGroups.map(([clusterId, points], index) => (
                      <Scatter
                        key={`cluster-${clusterId}`}
                        name={`Cluster ${clusterId} - ${points[0]?.cluster_label || ""}`}
                        data={points}
                        fill={CLUSTER_COLORS[index % CLUSTER_COLORS.length]}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cluster Legend</p>
                <div className="mt-3 space-y-2">
                  {scatterGroups.map(([clusterId, points], index) => (
                    <div key={`legend-${clusterId}`} className="flex items-center gap-2 text-sm text-slate-700">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: CLUSTER_COLORS[index % CLUSTER_COLORS.length] }}
                      />
                      <span>{`Cluster ${clusterId} - ${points[0]?.cluster_label || ""}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Cluster Summary</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Cluster</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Stock Count</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Avg Momentum</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Avg Volatility</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Avg Trend</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Avg Opportunity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Insight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {clusterData.cluster_summary.map((row) => (
                    <tr key={`summary-${row.cluster}`}>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {row.cluster_label} ({row.cluster})
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{row.stock_count}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatPercent(row.avg_momentum)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatPercent(row.avg_volatility)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatDecimal(row.avg_trend)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatDecimal(row.avg_opportunity)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Stock Factor Table</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Momentum</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Volatility</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Dist MA50</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Dist MA200</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Drawdown</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Dist 52W High</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">RSI (14)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Beta vs NIFTY</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Trend</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Opportunity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Cluster</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {clusterData.features.map((row) => (
                    <tr key={`row-${row.stock}`}>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.stock}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatPercent(row.momentum)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatPercent(row.volatility)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatPercent(row.dist_ma50)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatPercent(row.dist_ma200)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatPercent(row.drawdown)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatPercent(row.dist_52w_high)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatDecimal(row.rsi)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatDecimal(row.beta)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatDecimal(row.trend)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatDecimal(row.opportunity_score)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.cluster_label} ({row.cluster})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Cluster Meaning</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Cluster</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {CLUSTER_MEANINGS.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.label}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Top Opportunity Stocks</h2>
            <p className="mt-1 text-sm text-slate-600">Ranked by multi-factor opportunity score.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Opportunity Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(clusterData.top_opportunities || []).map((row) => (
                    <tr key={`op-${row.stock}`}>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.stock}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatDecimal(row.opportunity_score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
