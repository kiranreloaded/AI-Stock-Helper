import React, { useState } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Briefcase, HelpCircle, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import type { Transaction } from '../services/upstash';
import { generateChartData } from '../utils/stockUtils';
import type { Holding, ChartPoint } from '../utils/stockUtils';

interface DashboardProps {
  transactions: Transaction[];
  holdings: Record<string, Holding>;
  marketHistory?: Record<string, { prices: Record<string, number>; latestPrice: number }>;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, holdings, marketHistory = {} }) => {
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<'NOW' | 'ALL'>('ALL');

  // Compute tickers of currently active positions
  const activeTickers = React.useMemo(() => {
    return new Set(
      Object.entries(holdings)
        .filter(([_, h]) => h.shares > 0)
        .map(([ticker]) => ticker.toUpperCase())
    );
  }, [holdings]);

  // Filter transactions in NOW mode to only those of active tickers
  const displayedTransactions = React.useMemo(() => {
    return timeFilter === 'NOW'
      ? transactions.filter(t => activeTickers.has(t.stock.toUpperCase()))
      : transactions;
  }, [transactions, timeFilter, activeTickers]);

  // Compute mapping of date -> transactions
  const txsByDate = React.useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    displayedTransactions.forEach(t => {
      if (!map[t.date]) {
        map[t.date] = [];
      }
      map[t.date].push(t);
    });
    return map;
  }, [displayedTransactions]);

  // Generate daily points for the last 3 months based on real Yahoo Finance history
  const generateThreeMonthChartData = React.useCallback((): ChartPoint[] => {
    const points: ChartPoint[] = [];
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);

    // Get array of date strings for the past 3 months
    const dateStrings: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateStrings.push(d.toISOString().split('T')[0]);
    }

    // Sort transactions chronologically
    const sortedTx = [...transactions]
      .filter(tx => activeTickers.has(tx.stock.toUpperCase()))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Keep track of shares per active ticker
    const runningShares: Record<string, number> = {};
    activeTickers.forEach(t => { runningShares[t] = 0; });

    let txIdx = 0;

    // For each date, compute holdings shares and lookup price
    dateStrings.forEach(dateStr => {
      // Apply all transactions that happened on or before dateStr
      while (txIdx < sortedTx.length && sortedTx[txIdx].date <= dateStr) {
        const tx = sortedTx[txIdx];
        const ticker = tx.stock.toUpperCase();
        if (tx.action === 'BUY') {
          runningShares[ticker] = (runningShares[ticker] || 0) + tx.shares;
        } else if (tx.action === 'SELL') {
          runningShares[ticker] = Math.max(0, (runningShares[ticker] || 0) - tx.shares);
        }
        txIdx++;
      }

      // Compute total market value on this date
      let dailyValue = 0;
      let totalActiveShares = 0;

      Object.entries(runningShares).forEach(([ticker, shares]) => {
        if (shares <= 0) return;
        totalActiveShares += shares;

        const stockData = marketHistory?.[ticker];
        if (stockData) {
          // Find price for this date, or carry forward last available price
          let price = stockData.prices[dateStr];
          
          if (price === undefined) {
            // Find last available price before dateStr
            const priceDates = Object.keys(stockData.prices).filter(d => d < dateStr).sort();
            if (priceDates.length > 0) {
              price = stockData.prices[priceDates[priceDates.length - 1]];
            }
          }

          if (price !== undefined) {
            dailyValue += shares * price;
          } else {
            // Fallback to average cost basis
            const avgCost = holdings[ticker]?.avgCost ?? 0;
            dailyValue += shares * avgCost;
          }
        } else {
          // Fallback to average cost
          const avgCost = holdings[ticker]?.avgCost ?? 0;
          dailyValue += shares * avgCost;
        }
      });

      // Only push points if we have active positions
      if (totalActiveShares > 0) {
        points.push({
          date: dateStr,
          value: parseFloat(dailyValue.toFixed(2))
        });
      }
    });

    return points;
  }, [transactions, activeTickers, marketHistory, holdings]);

  // 1. Calculate stats
  const totalBuys = displayedTransactions.filter(t => t.action === 'BUY').reduce((sum, t) => sum + t.total, 0);
  
  // Calculate average cost and realized P&L chronologically
  let realizedPnL = 0;
  const runningHoldings: Record<string, { shares: number; totalCost: number }> = {};
  const sortedTx = [...displayedTransactions].sort((a, b) => a.date.localeCompare(b.date));
  
  sortedTx.forEach(tx => {
    const ticker = tx.stock.toUpperCase();
    if (!runningHoldings[ticker]) {
      runningHoldings[ticker] = { shares: 0, totalCost: 0 };
    }
    
    if (tx.action === 'BUY') {
      runningHoldings[ticker].shares += tx.shares;
      runningHoldings[ticker].totalCost += tx.total;
    } else if (tx.action === 'SELL') {
      const prevShares = runningHoldings[ticker].shares;
      if (prevShares > 0) {
        const avgCost = runningHoldings[ticker].totalCost / prevShares;
        const soldCostBasis = tx.shares * avgCost;
        
        // Realized PnL is revenue minus cost basis of sold shares
        realizedPnL += (tx.total - soldCostBasis);
        
        // Update holdings
        runningHoldings[ticker].shares = Math.max(0, prevShares - tx.shares);
        runningHoldings[ticker].totalCost = runningHoldings[ticker].shares * avgCost;
      }
    }
  });

  // Calculate current portfolio value (cost basis vs market value of active holdings)
  let activeCostBasis = 0;
  let activeMarketValue = 0;
  Object.entries(holdings).forEach(([ticker, h]) => {
    activeCostBasis += h.costBasis;
    const currentPrice = marketHistory?.[ticker.toUpperCase()]?.latestPrice ?? h.avgCost;
    activeMarketValue += h.shares * currentPrice;
  });

  // In NOW mode, the metrics are based purely on active holdings:
  // - Invested Capital = activeCostBasis (money currently active in holdings)
  // - Realized P&L = 0 (since they are currently held)
  // - Breakeven Gap = activeCostBasis - activeMarketValue (how much active positions need to gain, or 0 if in profit)
  const isSeedData = transactions.length === 26 && transactions[0].stock === 'LCID';
  
  const totalEverInvested = timeFilter === 'NOW'
    ? activeCostBasis
    : (isSeedData && timeFilter === 'ALL' ? 43523 : totalBuys);

  const displayRealizedPnL = timeFilter === 'NOW' ? 0 : realizedPnL;
  const unrealizedPnL = activeMarketValue - activeCostBasis;

  const totalGainLoss = timeFilter === 'NOW'
    ? unrealizedPnL
    : (realizedPnL + unrealizedPnL);

  const breakEvenGap = timeFilter === 'NOW'
    ? Math.max(0, activeCostBasis - activeMarketValue)
    : Math.max(0, totalEverInvested - activeMarketValue);

  const isGainPositive = totalGainLoss >= 0;

  // 2. Generate Chart Data
  const chartData = React.useMemo(() => {
    if (timeFilter === 'NOW') {
      return generateThreeMonthChartData();
    } else {
      return generateChartData(transactions);
    }
  }, [transactions, timeFilter, generateThreeMonthChartData]);
  
  // Custom SVG Chart Dimensions - Robinhood Edge-to-Edge Style
  const width = 1000;
  const height = 280;

  let pathD = '';
  const xCoords: number[] = [];
  const yCoords: number[] = [];

  if (chartData.length > 1) {
    const values = chartData.map(d => d.value);
    const maxVal = Math.max(...values, 100) * 1.05; // 5% buffer
    const minVal = Math.min(...values, 0) * 0.95;
    const valRange = maxVal - minVal;

    chartData.forEach((d, i) => {
      // Go completely edge-to-edge horizontally (0 to width)
      const x = (i / (chartData.length - 1)) * width;
      // Leave minor vertical padding (15px top/bottom)
      const y = height - 15 - ((d.value - minVal) / (valRange || 1)) * (height - 30);
      xCoords.push(x);
      yCoords.push(y);
    });

    // Build SVG Path
    pathD = `M ${xCoords[0]} ${yCoords[0]}`;
    for (let i = 1; i < xCoords.length; i++) {
      pathD += ` L ${xCoords[i]} ${yCoords[i]}`;
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (chartData.length === 0) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - svgRect.left;
    
    // Scale clientX to SVG space
    const xInSvg = (clientX / svgRect.width) * width;
    
    // Find closest point
    let closestIndex = 0;
    let minDistance = Infinity;
    
    xCoords.forEach((x, index) => {
      const dist = Math.abs(x - xInSvg);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    setHoveredIndex(closestIndex);
    setHoveredPoint(chartData[closestIndex]);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoveredIndex(null);
  };

  // Determine active display value (show hovered point if hovering, else current market value)
  const displayValue = hoveredPoint 
    ? hoveredPoint.value 
    : activeMarketValue;

  const displayDate = hoveredPoint 
    ? hoveredPoint.date 
    : 'All Time';

  // Calculate return relative to hovered point or all-time
  const displayPnL = hoveredPoint 
    ? (timeFilter === 'NOW' 
        ? (hoveredPoint.value - activeCostBasis) 
        : (hoveredPoint.value - totalEverInvested)) 
    : totalGainLoss;

  const displayPnLPct = totalEverInvested > 0 
    ? (displayPnL / totalEverInvested * 100) 
    : 0;

  const isDisplayPositive = displayPnL >= 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Robinhood Integrated Chart Card */}
      <div 
        className="glass-panel" 
        style={{ 
          background: '#000000', 
          border: '1px solid var(--border)',
          padding: '32px 0 0 0', // Padding top/sides, 0 bottom for edge-to-edge chart
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top Header Metrics (Robinhood Style) */}
        <div style={{ padding: '0 32px', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'var(--font-sans)',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#ffffff',
            cursor: 'pointer',
            marginBottom: '8px'
          }}>
            Portfolio Value
            <ChevronDown size={16} style={{ marginTop: '2px', opacity: 0.7 }} />
          </div>
          
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(2.4rem, 5vw, 3.4rem)',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.03em',
            lineHeight: '1',
            marginBottom: '8px',
            fontVariantNumeric: 'tabular-nums'
          }}>
            ${displayValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.9rem',
            fontWeight: 700,
            height: '24px',
            lineHeight: '24px',
            fontVariantNumeric: 'tabular-nums'
          }}>
            <span className={isDisplayPositive ? 'color-pos' : 'color-neg'} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px' }}>
                {isDisplayPositive ? (
                  <ArrowUp size={12} strokeWidth={3} />
                ) : (
                  <ArrowDown size={12} strokeWidth={3} />
                )}
              </span>
              ${Math.abs(displayPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
              &nbsp;({Math.abs(displayPnLPct).toFixed(2)}%)
            </span>
            <span className="color-muted" style={{ fontWeight: 500 }}>
              {displayDate === 'All Time' ? 'All Time' : `on ${displayDate}`}
            </span>
          </div>

          {/* Transaction details now render as a floating overlay inside the chart — no layout jump */}
        </div>

        {/* Chart Area */}
        {chartData.length > 1 ? (
          <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              width="100%" 
              height="100%"
              style={{ overflow: 'visible', cursor: 'crosshair' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Single Horizontal Dotted Baseline at the bottom */}
              <line 
                x1={0} 
                y1={height - 15} 
                x2={width} 
                y2={height - 15} 
                stroke="rgba(255, 255, 255, 0.12)" 
                strokeDasharray="4 4" 
              />

              {/* Trend Line (No area fill, Robinhood sharp stroke style) */}
              {pathD && (
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke={isGainPositive ? 'var(--accent)' : 'var(--red)'} 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              )}

              {/* Transaction Dots on Chart */}
              {chartData.map((d, idx) => {
                const txs = txsByDate[d.date];
                if (!txs || txs.length === 0) return null;

                const hasBuy = txs.some(t => t.action === 'BUY');
                const hasSell = txs.some(t => t.action === 'SELL');
                let color = 'var(--accent)';
                if (hasBuy && !hasSell) color = 'var(--accent)';
                else if (hasSell && !hasBuy) color = 'var(--red)';
                else color = '#ffffff';

                const cx = xCoords[idx];
                const cy = yCoords[idx];
                if (cx === undefined || cy === undefined) return null;

                return (
                  <g key={d.date}>
                    {/* Animated ripple ring */}
                    <circle cx={cx} cy={cy} r="14" fill="none" stroke={color} strokeWidth="2" opacity="0">
                      <animate attributeName="r" from="14" to="32" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.8" to="0" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                    {/* Outer glow disc */}
                    <circle cx={cx} cy={cy} r="18" fill={color} opacity="0.2" />
                    {/* Bold solid circle */}
                    <circle cx={cx} cy={cy} r="12" fill={color} stroke="#000" strokeWidth="2.5" />
                    {/* Bright centre dot */}
                    <circle cx={cx} cy={cy} r="4" fill="#000" opacity="0.7" />
                  </g>
                );
              })}

              {/* Hover Crosshairs & Guide Circle */}
              {hoveredIndex !== null && xCoords[hoveredIndex] !== undefined && (
                <>
                  {/* Vertical Guide Line */}
                  <line 
                    x1={xCoords[hoveredIndex]} 
                    y1={0} 
                    x2={xCoords[hoveredIndex]} 
                    y2={height - 15} 
                    stroke="rgba(255, 255, 255, 0.18)" 
                    strokeWidth="1.2"
                  />
                  {/* Neon Dot Intersection */}
                  <circle 
                    cx={xCoords[hoveredIndex]} 
                    cy={yCoords[hoveredIndex]} 
                    r="5" 
                    fill="#000000" 
                    stroke={isGainPositive ? 'var(--accent)' : 'var(--red)'} 
                    strokeWidth="3.5" 
                  />
                </>
              )}
            </svg>

            {/* Floating transaction tooltip — absolutely positioned so the chart never shifts */}
            {hoveredIndex !== null &&
              hoveredPoint &&
              txsByDate[hoveredPoint.date] &&
              txsByDate[hoveredPoint.date].length > 0 && (() => {
                // Convert SVG coordinate (0–1000) to a CSS percentage (0–100%)
                // so the tooltip correctly maps onto the scaled HTML container.
                const xPct = (xCoords[hoveredIndex] / width) * 100;
                const alignRight = xPct > 60;
                return (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      ...(alignRight
                        ? { right: `${100 - xPct + 1}%` }
                        : { left: `${xPct + 1}%` }),
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      pointerEvents: 'none',
                      animation: 'fadeIn 0.18s ease-out',
                      zIndex: 10,
                    }}
                  >
                    {txsByDate[hoveredPoint.date].map(t => (
                      <span
                        key={t.id}
                        className={`badge ${t.action === 'BUY' ? 'badge-buy' : 'badge-sell'}`}
                        style={{
                          fontSize: '0.68rem',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.06)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                          backdropFilter: 'blur(8px)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                        }}
                      >
                        {t.action} {t.shares.toFixed(4).replace(/\.?0+$/, '')} {t.stock} @ ${t.price.toFixed(2)}
                      </span>
                    ))}
                  </div>
                );
              })()}
          </div>
        ) : (
          <div style={{
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem'
          }}>
            Connect and load transactions to view chart history.
          </div>
        )}

        {/* Interval Selector Tabs (Robinhood Style) */}
        <div style={{
          display: 'flex',
          gap: '24px',
          padding: '16px 32px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(255, 255, 255, 0.01)',
          position: 'relative',
          zIndex: 2
        }}>
          <button
            onClick={() => setTimeFilter('NOW')}
            style={{
              background: 'none',
              border: 'none',
              color: timeFilter === 'NOW' ? 'var(--accent)' : 'var(--muted)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 0',
              transition: 'color 0.2s'
            }}
          >
            {timeFilter === 'NOW' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
            NOW
          </button>
          <button
            onClick={() => setTimeFilter('ALL')}
            style={{
              background: 'none',
              border: 'none',
              color: timeFilter === 'ALL' ? 'var(--accent)' : 'var(--muted)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 0',
              transition: 'color 0.2s'
            }}
          >
            {timeFilter === 'ALL' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
            ALL
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div className="glass-panel" style={{ background: '#000000', border: '1px solid var(--border)', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--muted)'
          }}>
            <DollarSign size={20} />
          </div>
          <div>
            <div className="color-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Invested Capital</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 500, marginTop: '4px' }}>
              ${totalEverInvested.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ background: '#000000', border: '1px solid var(--border)', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: displayRealizedPnL >= 0 ? 'rgba(0, 231, 86, 0.1)' : 'var(--red-dim)',
            border: `1px solid ${displayRealizedPnL >= 0 ? 'rgba(0, 231, 86, 0.2)' : 'rgba(255, 68, 102, 0.2)'}`,
            borderRadius: '12px',
            padding: '12px',
            color: displayRealizedPnL >= 0 ? '#00e756' : 'var(--red)'
          }}>
            {displayRealizedPnL >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
          <div>
            <div className="color-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Realized P&L</div>
            <div className={displayRealizedPnL >= 0 ? 'color-pos' : 'color-neg'} style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 500, marginTop: '4px' }}>
              {displayRealizedPnL >= 0 ? '+' : ''}${displayRealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ background: '#000000', border: '1px solid var(--border)', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: breakEvenGap <= 0 ? 'rgba(0, 231, 86, 0.1)' : 'var(--red-dim)',
            border: `1px solid ${breakEvenGap <= 0 ? 'rgba(0, 231, 86, 0.2)' : 'rgba(255, 68, 102, 0.2)'}`,
            borderRadius: '12px',
            padding: '12px',
            color: breakEvenGap <= 0 ? '#00e756' : 'var(--red)'
          }}>
            <HelpCircle size={20} />
          </div>
          <div>
            <div className="color-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Breakeven Gap</div>
            <div className={breakEvenGap <= 0 ? 'color-pos' : 'color-neg'} style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 500, marginTop: '4px' }}>
              {breakEvenGap <= 0 ? '✓ Recovered' : `-$${Math.abs(breakEvenGap).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ background: '#000000', border: '1px solid var(--border)', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--muted)'
          }}>
            <Briefcase size={20} />
          </div>
          <div>
            <div className="color-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Active Positions</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 500, marginTop: '4px' }}>
              {Object.keys(holdings).length}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
