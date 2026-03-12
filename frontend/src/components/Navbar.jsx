import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ACTIVE_PORTFOLIO_KEY = "active_portfolio_id";

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activePortfolioId = sessionStorage.getItem(ACTIVE_PORTFOLIO_KEY);
  const stocksPath = activePortfolioId
    ? `/stocks?portfolio=${activePortfolioId}`
    : "/portfolio?notice=select-portfolio";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isPortfolio = location.pathname === "/portfolio";
  const isStocks = location.pathname.startsWith("/stocks");
  const isCompare = location.pathname.startsWith("/compare");
  const isClusters = location.pathname.includes("/clusters");
  const isPrediction = location.pathname.startsWith("/prediction");

  const linkClass = (active) =>
    `relative rounded-lg px-3 py-2 text-sm font-semibold transition ${
      active
        ? "text-brand-700 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-brand-600"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/portfolio" className="text-lg font-bold text-brand-900">
          AUTO INVEST
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/portfolio" className={linkClass(isPortfolio)}>
                Portfolio
              </Link>
              <Link
                to={stocksPath}
                className={`${linkClass(isStocks)} ${activePortfolioId ? "" : "opacity-70"}`}
                title={activePortfolioId ? "Open active portfolio stocks" : "Select a portfolio first"}
              >
                Stocks
              </Link>
              <Link to="/compare" className={linkClass(isCompare)}>
                Compare Stocks
              </Link>
              <Link to="/prediction" className={linkClass(isPrediction)}>
                Price Prediction
              </Link>
              <Link
                to={activePortfolioId ? `/portfolio/${activePortfolioId}/clusters` : "/portfolio?notice=select-portfolio"}
                className={linkClass(isClusters)}
                title={activePortfolioId ? "Open portfolio clustering analysis" : "Select a portfolio first"}
              >
                Clusters
              </Link>
              <span className="hidden text-sm text-slate-600 sm:inline">{user?.username}</span>
              <button type="button" onClick={handleLogout} className="btn-secondary">
                Logout
              </button>
            </>
          ) : (
            <>
              {location.pathname !== "/login" && (
                <Link to="/login" className="btn-secondary">
                  Login
                </Link>
              )}
              {location.pathname !== "/register" && (
                <Link to="/register" className="btn-primary">
                  Register
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
