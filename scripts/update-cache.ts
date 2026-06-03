import * as fs from 'fs';
import * as path from 'path';

interface Transaction {
  id: number;
  date: string;
  stock: string;
  action: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total: number;
  notes: string;
}

interface StockHistory {
  prices: Record<string, number>;
  latestPrice: number;
}

type MarketHistoryCache = Record<string, StockHistory>;

// Load .env variables
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
          if (key) {
            process.env[key] = val;
          }
        }
      }
    });
  }
}

loadEnv();

const url = process.env.UPSTASH_URL;
const token = process.env.UPSTASH_TOKEN;

if (!url || !token) {
  console.error('Error: UPSTASH_URL and UPSTASH_TOKEN must be defined in your .env file.');
  process.exit(1);
}

// Clean url
const cleanUrl = url.trim().replace(/\/$/, '');
const headers = { Authorization: `Bearer ${token.trim()}` };

async function fetchFromUpstash<T>(key: string): Promise<T | null> {
  const res = await fetch(`${cleanUrl}/get/${key}`, { headers });
  if (!res.ok) {
    throw new Error(`Upstash error: ${res.statusText}`);
  }
  const data = (await res.json()) as { result?: string; error?: string };
  if (data.error) {
    throw new Error(`Upstash error: ${data.error}`);
  }
  if (!data.result) return null;
  let parsed = JSON.parse(data.result);
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }
  return parsed as T;
}

async function writeToUpstash<T>(key: string, value: T): Promise<void> {
  const res = await fetch(`${cleanUrl}/set/${key}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value))
  });
  if (!res.ok) {
    throw new Error(`Upstash write error: ${res.statusText}`);
  }
  const data = (await res.json()) as { error?: string };
  if (data.error) {
    throw new Error(`Upstash write error: ${data.error}`);
  }
}

async function fetchStockData(ticker: string): Promise<StockHistory> {
  const cleanTicker = ticker.toUpperCase().trim();
  const rawUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1d&range=3mo`;
  
  const response = await fetch(rawUrl);
  if (!response.ok) {
    throw new Error(`Yahoo Finance returned status ${response.status}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await response.json()) as any;
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
      const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
      const roundedPrice = parseFloat(rawPrice.toFixed(2));
      prices[dateStr] = roundedPrice;
      lastValidPrice = roundedPrice;
    }
  });

  const latestPrice = metaLatest !== undefined && metaLatest !== null 
    ? parseFloat(metaLatest.toFixed(2)) 
    : parseFloat(lastValidPrice.toFixed(2));

  return {
    prices,
    latestPrice
  };
}

async function main() {
  console.log('Fetching active transactions from database...');
  const txs = await fetchFromUpstash<Transaction[]>('transactions');
  if (!txs || !Array.isArray(txs)) {
    console.error('No transactions found in Upstash database or format invalid.');
    process.exit(1);
  }

  // Compute active tickers (where shares > 0)
  const holdings: Record<string, number> = {};
  txs.forEach(tx => {
    const ticker = tx.stock.toUpperCase();
    if (tx.action === 'BUY') {
      holdings[ticker] = (holdings[ticker] || 0) + tx.shares;
    } else if (tx.action === 'SELL') {
      holdings[ticker] = Math.max(0, (holdings[ticker] || 0) - tx.shares);
    }
  });

  const activeTickers = Object.keys(holdings).filter(t => holdings[t] > 0);
  console.log(`Active tickers found: ${activeTickers.join(', ')}`);

  if (activeTickers.length === 0) {
    console.log('No active positions. Exiting.');
    process.exit(0);
  }

  console.log('Loading existing cache from database...');
  const cacheObj = await fetchFromUpstash<{ lastUpdated: number; data: MarketHistoryCache }>('market_history');
  const existingCache = cacheObj?.data || {};

  const freshCache: MarketHistoryCache = {};
  let successCount = 0;

  for (const ticker of activeTickers) {
    console.log(`Fetching price history for ${ticker}...`);
    try {
      const data = await fetchStockData(ticker);
      freshCache[ticker] = data;
      successCount++;
      console.log(`✓ Fetched ${ticker} successfully. Latest price: $${data.latestPrice}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`✗ Failed to fetch price history for ${ticker}:`, errMsg);
    }
  }

  if (successCount === 0) {
    console.error('Failed to fetch pricing data for any of the active tickers. Database cache will not be updated.');
    process.exit(1);
  }

  // Merge with existing cache
  const mergedCache = {
    ...existingCache,
    ...freshCache
  };

  console.log('Writing merged cache to database...');
  await writeToUpstash('market_history', {
    lastUpdated: Date.now(),
    data: mergedCache
  });

  console.log(`\nSuccessfully updated cache in Upstash database! (${successCount}/${activeTickers.length} updated).`);
}

main().catch(err => {
  console.error('Fatal error running cache update script:', err);
  process.exit(1);
});
