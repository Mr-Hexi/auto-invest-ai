import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Loader from "../components/Loader";
import SearchBar from "../components/SearchBar";
import StockTable from "../components/StockTable";
import { currencyCodeFromItem, formatMoney } from "../utils/currency";
import {
  addStockToPortfolio,
  fetchPortfolio,
  fetchStocks,
  removeStockFromPortfolio,
  searchLiveStocks,
} from "../api/stocks";

const ACTIVE_PORTFOLIO_KEY = "active_portfolio_id";

export default function Stocks() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const portfolioId = searchParams.get("portfolio");

  const [portfolios, setPortfolios] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingSymbol, setAddingSymbol] = useState("");
  const [deletingStockId, setDeletingStockId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [openingClusters, setOpeningClusters] = useState(false);

  const selectedPortfolio = useMemo(
    () => portfolios.find((item) => String(item.id) === String(portfolioId)) || null,
    [portfolios, portfolioId]
  );

  const peChartData = useMemo(
    () =>
      stocks.map((stock) => ({
        symbol: stock.symbol,
        pe_ratio: Number(stock.pe_ratio || 0),
      })),
    [stocks]
  );
  const portfolioSymbols = useMemo(
    () => new Set(stocks.map((stock) => String(stock.symbol).toUpperCase())),
    [stocks]
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const [portfolioData, stockData] = await Promise.all([
          fetchPortfolio(),
          fetchStocks(portfolioId),
        ]);
        const normalizedStocks = Array.isArray(stockData) ? stockData : [];
        const normalizedPortfolios = Array.isArray(portfolioData) ? portfolioData : [];
        const portfolioExists = normalizedPortfolios.some(
          (item) => String(item.id) === String(portfolioId)
        );
        if (!portfolioExists) {
          navigate("/portfolio?notice=select-portfolio", { replace: true });
          return;
        }

        sessionStorage.setItem(ACTIVE_PORTFOLIO_KEY, String(portfolioId));
        setPortfolios(normalizedPortfolios);
        setStocks(normalizedStocks);
      } catch {
        setError("Unable to load stocks for this portfolio.");
      } finally {
        setLoading(false);
      }
    };

    if (!portfolioId) {
      const activePortfolioId = sessionStorage.getItem(ACTIVE_PORTFOLIO_KEY);
      if (activePortfolioId) {
        navigate(`/stocks?portfolio=${activePortfolioId}`, { replace: true });
        return;
      }
      navigate("/portfolio?notice=select-portfolio", { replace: true });
      return;
    }

    loadData();
  }, [navigate, portfolioId]);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!portfolioId) {
      return;
    }

    setTableLoading(true);
    setError("");
    setMessage("");
    try {
      if (!searchQuery.trim()) {
        setSearchResults([]);
      } else {
        const results = await searchLiveStocks(searchQuery.trim(), 20);
        setSearchResults(results || []);
      }
    } catch {
      setError("Search request failed.");
    } finally {
      setTableLoading(false);
    }
  };

  const handleAddStock = async (symbol) => {
    if (!portfolioId || !symbol) {
      return;
    }

    setAddingSymbol(symbol);
    setMessage("");
    setError("");
    try {
      await addStockToPortfolio(portfolioId, String(symbol).trim().toUpperCase());
      const refreshed = await fetchStocks(portfolioId);
      setStocks(refreshed || []);
      setMessage(`${symbol} added to portfolio.`);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Unable to add stock. Check symbol and try again.";
      setError(message);
    } finally {
      setAddingSymbol("");
    }
  };

  const handleDeleteStock = async (stockId, symbol) => {
    if (!stockId || !portfolioId) {
      return;
    }

    setDeletingStockId(stockId);
    setMessage("");
    setError("");
    try {
      await removeStockFromPortfolio(stockId);
      const refreshed = await fetchStocks(portfolioId);
      setStocks(refreshed || []);
      setMessage(`${symbol} removed from portfolio.`);
    } catch (err) {
      const text =
        err.response?.data?.detail ||
        "Unable to delete stock. Please try again.";
      setError(text);
    } finally {
      setDeletingStockId(null);
    }
  };

  return (
    <section className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          {selectedPortfolio?.name || "Portfolio"} Stocks
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={openingClusters}
            onClick={() => {
              if (!portfolioId) {
                navigate("/portfolio?notice=select-portfolio");
                return;
              }
              setOpeningClusters(true);
              navigate(`/portfolio/${portfolioId}/clusters`);
            }}
          >
            {openingClusters ? "Opening..." : "Clustering Analysis"}
          </button>
          <Link to="/portfolio" className="btn-secondary">
            Back to Portfolio
          </Link>
        </div>
      </div>

      <div className="card p-6">
        <p className="mb-4 text-sm text-slate-600">
          {selectedPortfolio?.description || "Stocks for selected portfolio."}
        </p>
        <SearchBar value={searchQuery} onChange={setSearchQuery} onSubmit={handleSearch} />
        <p className="mt-2 text-xs text-slate-500">
          Search live symbols and add any result directly to this portfolio.
        </p>
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading || tableLoading ? (
        <div className="card p-5">
          <Loader />
        </div>
      ) : (
        <div className="space-y-6">
          {searchResults.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900">Search Results</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Symbol</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Company</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {searchResults.map((result) => {
                      const symbol = String(result.symbol || "").toUpperCase();
                      const alreadyAdded = portfolioSymbols.has(symbol);
                      return (
                        <tr key={symbol}>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">{result.symbol}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{result.company_name}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-700">
                            {formatMoney(result.current_price, currencyCodeFromItem(result))}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleAddStock(result.symbol)}
                              className="btn-primary"
                              disabled={alreadyAdded || addingSymbol === result.symbol}
                            >
                              {alreadyAdded
                                ? "Added"
                                : addingSymbol === result.symbol
                                  ? "Adding..."
                                  : "Add Stock"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {stocks.length === 0 ? (
            <div className="card p-8 text-center text-sm text-slate-500">
              <p className="font-semibold text-slate-700">Start building your portfolio</p>
              <p className="mt-2">No stocks in this portfolio yet. Search above to add stocks.</p>
            </div>
          ) : (
            <>
          <StockTable
            stocks={stocks}
            onDeleteStock={handleDeleteStock}
            deletingStockId={deletingStockId}
          />
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">PE Ratio Comparison</h2>
            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peChartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.7} />
                  <XAxis dataKey="symbol" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="pe_ratio" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

