import api from "./axios";

export const fetchPortfolio = async () => {
  const { data } = await api.get("portfolio/");
  return data;
};

export const createPortfolio = async (payload) => {
  const { data } = await api.post("portfolio/", payload);
  return data;
};

export const addStockToPortfolio = async (portfolioId, symbol) => {
  const { data } = await api.post(`portfolio/${portfolioId}/add-stock/`, { symbol });
  return data;
};

export const removeStockFromPortfolio = async (stockId) => {
  await api.delete(`stocks/${stockId}/remove/`);
};

export const fetchStocks = async (portfolioId = null) => {
  const queryParams = new URLSearchParams();
  if (portfolioId) {
    queryParams.set("portfolio", String(portfolioId));
  }
  const suffix = queryParams.toString() ? `?${queryParams.toString()}` : "";
  const { data } = await api.get(`stocks/${suffix}`);
  return data;
};

export const searchLiveStocks = async (query, limit = 10) => {
  const queryParams = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  const { data } = await api.get(`stocks/live-search/?${queryParams.toString()}`);
  return data;
};

export const fetchLiveStockBySymbol = async (symbol, options = {}) => {
  const queryParams = new URLSearchParams({ symbol });
  if (options.period) {
    queryParams.set("period", options.period);
  }
  if (options.interval) {
    queryParams.set("interval", options.interval);
  }
  const { data } = await api.get(`stocks/live-detail/?${queryParams.toString()}`);
  return data;
};

export const fetchLiveStockComparison = async (symbolA, symbolB, options = {}) => {
  const queryParams = new URLSearchParams({
    symbol_a: symbolA,
    symbol_b: symbolB,
  });
  if (options.period) {
    queryParams.set("period", options.period);
  }
  if (options.interval) {
    queryParams.set("interval", options.interval);
  }
  const { data } = await api.get(`stocks/live-compare/?${queryParams.toString()}`);
  return data;
};

export const fetchStockById = async (id) => {
  const { data } = await api.get(`stocks/${id}/`);
  return data;
};

export const fetchPortfolioClusters = async (portfolioId, nClusters = 3) => {
  const queryParams = new URLSearchParams({
    n_clusters: String(nClusters),
  });
  const { data } = await api.get(`portfolio/${portfolioId}/clusters/?${queryParams.toString()}`, {
    timeout: 120000,
  });
  return data;
};
