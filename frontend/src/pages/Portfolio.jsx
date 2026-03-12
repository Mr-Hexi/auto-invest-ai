import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Loader from "../components/Loader";
import { createPortfolio, fetchPortfolio } from "../api/stocks";

const ACTIVE_PORTFOLIO_KEY = "active_portfolio_id";

export default function Portfolio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [portfolios, setPortfolios] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [openingClusterId, setOpeningClusterId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const notice = searchParams.get("notice");
    if (notice === "select-portfolio") {
      setMessage("Please select or create a portfolio first.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const loadPortfolios = async () => {
      setLoading(true);
      setError("");
      try {
        const portfolioData = await fetchPortfolio();
        setPortfolios(Array.isArray(portfolioData) ? portfolioData : []);
      } catch {
        setError("Unable to load portfolios.");
      } finally {
        setLoading(false);
      }
    };

    loadPortfolios();
  }, []);

  const handleCreatePortfolio = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      return;
    }
    setCreating(true);
    setError("");
    setMessage("");
    try {
      const created = await createPortfolio({
        name: form.name.trim(),
        description: form.description.trim(),
      });
      sessionStorage.setItem(ACTIVE_PORTFOLIO_KEY, String(created.id));
      setPortfolios((prev) => [...prev, created]);
      setForm({ name: "", description: "" });
      setMessage("Portfolio created successfully.");
    } catch (err) {
      const text = err.response?.data?.name?.[0] || "Unable to create portfolio.";
      setError(text);
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="space-y-10">
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-slate-900">Create Portfolio</h2>
        <form onSubmit={handleCreatePortfolio} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="input"
            placeholder="Portfolio name"
            required
          />
          <input
            type="text"
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            className="input"
            placeholder="Description"
          />
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? "Creating..." : "Create Portfolio"}
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portfolios</h1>
            <p className="mt-1 text-sm text-slate-600">
              Choose a portfolio, then open Stocks or Clustering directly.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {portfolios.map((portfolio) => (
            <div
              key={portfolio.id}
              className="portfolio-card"
              role="button"
              tabIndex={0}
              onClick={() => {
                sessionStorage.setItem(ACTIVE_PORTFOLIO_KEY, String(portfolio.id));
                navigate(`/stocks?portfolio=${portfolio.id}`);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  sessionStorage.setItem(ACTIVE_PORTFOLIO_KEY, String(portfolio.id));
                  navigate(`/stocks?portfolio=${portfolio.id}`);
                }
              }}
            >
              <p className="text-sm font-semibold text-slate-900">{portfolio.name}</p>
              <p className="mt-1 text-xs text-slate-600">
                {portfolio.description || "No description"}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={openingClusterId === portfolio.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpeningClusterId(portfolio.id);
                    sessionStorage.setItem(ACTIVE_PORTFOLIO_KEY, String(portfolio.id));
                    navigate(`/portfolio/${portfolio.id}/clusters`);
                  }}
                >
                  {openingClusterId === portfolio.id ? "Opening..." : "Open Clustering"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <div className="card p-5">
          <Loader />
        </div>
      ) : portfolios.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">No portfolios found.</div>
      ) : (
        <div className="card p-8 text-center text-sm text-slate-500">
          Click any portfolio card to open Stocks. Use the card button to open Clustering directly.
        </div>
      )}
    </section>
  );
}
