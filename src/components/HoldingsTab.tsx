import React from 'react';
import { Briefcase, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Holding } from '../utils/stockUtils';

interface HoldingsTabProps {
  holdings: Record<string, Holding>;
  isConnected: boolean;
  marketHistory?: Record<string, { prices: Record<string, number>; latestPrice: number }>;
}

export const HoldingsTab: React.FC<HoldingsTabProps> = ({ holdings, isConnected, marketHistory = {} }) => {
  const rows = Object.entries(holdings).sort((a, b) => b[1].costBasis - a[1].costBasis);

  return (
    <div className="animate-fade-in">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text)' }}>Current Holdings</h2>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          color: 'var(--muted)'
        }}>
          Computed in real-time from transactions & live history
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Shares</th>
              <th>Avg Cost</th>
              <th>Cost Basis</th>
              <th>Current Price</th>
              <th>Market Value</th>
              <th>Unrealized P&L</th>
              <th>First Buy</th>
            </tr>
          </thead>
          <tbody>
            {!isConnected ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="color-muted pulse-slow" style={{ fontFamily: 'var(--font-mono)' }}>
                    Connect to load transaction history and compute holdings
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '60px' }}>
                  <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📊</div>
                    No holdings computed.
                    <br />
                    Please add buying transactions to establish a position.
                  </div>
                </td>
              </tr>
            ) : (
              rows.map(([ticker, h]) => {
                const tickerUpper = ticker.toUpperCase();
                const stockData = marketHistory[tickerUpper];
                const currentPrice = stockData ? stockData.latestPrice : h.avgCost;

                const currentValue = h.shares * currentPrice;
                const pnl = currentValue - h.costBasis;
                const pnlPct = h.costBasis > 0 ? (pnl / h.costBasis) * 100 : 0;
                
                const hasRealPrice = !!stockData;

                return (
                  <tr key={ticker}>
                    <td>
                      <span style={{
                        color: 'var(--accent)',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Briefcase size={12} className="color-muted" />
                        {ticker}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {h.shares.toFixed(4).replace(/\.?0+$/, '')}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      ${h.avgCost.toFixed(2)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      ${h.costBasis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: hasRealPrice ? 'var(--text)' : 'var(--muted)' }}>
                        ${currentPrice.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                      ${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      <span 
                        className={pnl > 0.01 ? 'color-pos' : pnl < -0.01 ? 'color-neg' : 'color-muted'} 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontWeight: 500
                        }}
                      >
                        {pnl > 0.01 && <ArrowUpRight size={12} />}
                        {pnl < -0.01 && <ArrowDownRight size={12} />}
                        {pnl > 0.01 ? '+' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        ({pnlPct.toFixed(2)}%)
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                      {h.firstBuy}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
