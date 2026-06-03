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
  
  // List of public CORS proxies to try sequentially
  const proxies = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ];

  let lastError: Error | null = null;

  for (const proxyFn of proxies) {
    try {
      const url = proxyFn(rawUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`CORS Proxy returned status ${response.status}`);
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
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Proxy failed for ${cleanTicker}, trying next:`, lastError.message);
    }
  }

  throw new Error(`Failed to fetch Yahoo Finance chart data for ${cleanTicker} (all proxies failed): ${lastError?.message || lastError}`);
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
