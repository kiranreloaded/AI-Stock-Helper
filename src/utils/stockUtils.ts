import type { Transaction } from '../services/upstash';

export interface Holding {
  shares: number;
  avgCost: number;
  costBasis: number;
  firstBuy: string;
}

export interface ChartPoint {
  date: string;
  value: number;
}


/**
 * Computes active stock holdings from a ledger of transactions.
 * Uses standard average cost basis adjustment on sales.
 */
export function computeHoldings(transactions: Transaction[]): Record<string, Holding> {
  const h: Record<string, { shares: number; totalCost: number; firstBuy: string }> = {};
  
  if (!Array.isArray(transactions)) return {};
  const validTx = transactions.filter(tx => tx && typeof tx === 'object' && typeof tx.date === 'string');
  const sortedTx = [...validTx].sort((a, b) => a.date.localeCompare(b.date));
  
  sortedTx.forEach(tx => {
    const ticker = tx.stock.toUpperCase();
    if (!h[ticker]) {
      h[ticker] = { shares: 0, totalCost: 0, firstBuy: tx.date };
    }
    
    if (tx.action === 'BUY') {
      h[ticker].shares += tx.shares;
      h[ticker].totalCost += tx.total;
    } else if (tx.action === 'SELL') {
      const prevShares = h[ticker].shares;
      if (prevShares > 0) {
        const avgCostBeforeSell = h[ticker].totalCost / prevShares;
        h[ticker].shares = Math.max(0, prevShares - tx.shares);
        h[ticker].totalCost = h[ticker].shares * avgCostBeforeSell;
      }
    }
    
    if (tx.date < h[ticker].firstBuy) {
      h[ticker].firstBuy = tx.date;
    }
  });

  const result: Record<string, Holding> = {};
  Object.keys(h).forEach(ticker => {
    const data = h[ticker];
    if (data.shares > 0) {
      const avgCost = data.totalCost / data.shares;
      result[ticker] = {
        shares: data.shares,
        avgCost: avgCost,
        costBasis: data.shares * avgCost,
        firstBuy: data.firstBuy
      };
    }
  });
  
  return result;
}



/**
 * Aggregates chronological transactions to yield daily cost-basis valuation points
 */
export function generateChartData(transactions: Transaction[]): ChartPoint[] {
  if (!Array.isArray(transactions)) return [];
  const validTx = transactions.filter(tx => tx && typeof tx === 'object' && typeof tx.date === 'string');
  const sorted = [...validTx].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];
  
  const points: ChartPoint[] = [];
  const holdings: Record<string, { shares: number; totalCost: number }> = {};
  
  sorted.forEach(tx => {
    const ticker = tx.stock.toUpperCase();
    if (!holdings[ticker]) {
      holdings[ticker] = { shares: 0, totalCost: 0 };
    }
    
    if (tx.action === 'BUY') {
      holdings[ticker].shares += tx.shares;
      holdings[ticker].totalCost += tx.total;
    } else if (tx.action === 'SELL') {
      const prevShares = holdings[ticker].shares;
      if (prevShares > 0) {
        const avgCost = holdings[ticker].totalCost / prevShares;
        holdings[ticker].shares = Math.max(0, prevShares - tx.shares);
        holdings[ticker].totalCost = holdings[ticker].shares * avgCost;
      }
    }
    
    const totalBasis = Object.values(holdings).reduce((sum, h) => sum + h.totalCost, 0);
    points.push({
      date: tx.date,
      value: parseFloat(totalBasis.toFixed(2))
    });
  });
  
  const uniqueDates: Record<string, number> = {};
  points.forEach(p => {
    uniqueDates[p.date] = p.value;
  });
  
  return Object.entries(uniqueDates)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
