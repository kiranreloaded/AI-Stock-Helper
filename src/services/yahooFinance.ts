export interface StockHistory {
  prices: Record<string, number>; // date (YYYY-MM-DD) -> close price
  latestPrice: number;
}

export type MarketHistoryCache = Record<string, StockHistory>;

/**
 * Fetches 3-month daily history and latest price for a stock ticker from Yahoo Finance.
 */
export async function fetchStockData(ticker: string): Promise<StockHistory> {
  const cleanTicker = ticker.toUpperCase().trim();
  const rawUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1d&range=3mo`;
  const url = `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Yahoo Finance chart data for ${cleanTicker}`);
  }

  const json = await response.json();
  const result = json?.chart?.result?.[0];

  if (!result) {
    throw new Error(`Invalid format returned from Yahoo Finance for ${cleanTicker}`);
  }

  const timestamps: number[] = result.timestamp || [];
  const quotes = result.indicators?.quote?.[0]?.close || [];
  const metaLatest = result.meta?.regularMarketPrice;

  const prices: Record<string, number> = {};
  let lastValidPrice = metaLatest || 0;

  timestamps.forEach((ts, idx) => {
    const rawPrice = quotes[idx];
    if (rawPrice !== undefined && rawPrice !== null) {
      // Convert epoch seconds to YYYY-MM-DD local/UTC date format
      const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
      const roundedPrice = parseFloat(rawPrice.toFixed(2));
      prices[dateStr] = roundedPrice;
      lastValidPrice = roundedPrice;
    }
  });

  // Ensure latest price is populated
  const latestPrice = metaLatest !== undefined && metaLatest !== null 
    ? parseFloat(metaLatest.toFixed(2)) 
    : parseFloat(lastValidPrice.toFixed(2));

  return {
    prices,
    latestPrice
  };
}

/**
 * Fetches stock data for multiple tickers concurrently.
 */
export async function fetchMultipleStocks(tickers: string[]): Promise<MarketHistoryCache> {
  const uniqueTickers = Array.from(new Set(tickers)).filter(Boolean);
  const cache: MarketHistoryCache = {};

  const promises = uniqueTickers.map(async (ticker) => {
    try {
      const data = await fetchStockData(ticker);
      cache[ticker.toUpperCase()] = data;
    } catch (err) {
      console.warn(`Could not fetch data for ticker: ${ticker}`, err);
    }
  });

  await Promise.all(promises);
  return cache;
}
