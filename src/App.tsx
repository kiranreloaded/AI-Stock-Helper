import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ConnectionModal } from './components/ConnectionModal';
import { Dashboard } from './components/Dashboard';
import { TransactionsTab } from './components/TransactionsTab';
import { HoldingsTab } from './components/HoldingsTab';
import { AddTransactionModal } from './components/AddTransactionModal';
import { HeroSection } from './components/HeroSection';
import { UpstashService } from './services/upstash';
import type { Transaction } from './services/upstash';
import { computeHoldings } from './utils/stockUtils';
import { fetchMultipleStocks } from './services/yahooFinance';
import type { MarketHistoryCache } from './services/yahooFinance';
import { LayoutGrid, ListCollapse, LineChart } from 'lucide-react';

const UPSTASH_URL_KEY = 'upstash_url';
const UPSTASH_TOKEN_KEY = 'upstash_token';
const TX_KEY = 'transactions';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'holdings' | 'transactions'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [upstashUrl, setUpstashUrl] = useState(() => sessionStorage.getItem(UPSTASH_URL_KEY) || '');
  const [upstashToken, setUpstashToken] = useState(() => sessionStorage.getItem(UPSTASH_TOKEN_KEY) || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState('');
  const [marketHistory, setMarketHistory] = useState<Record<string, { prices: Record<string, number>; latestPrice: number }>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'ok' | 'err' | null }>({
    message: '',
    type: null
  });

  const upstashServiceRef = useRef<UpstashService | null>(null);

  // Show status banner notification with auto-dismiss
  const showNotification = (msg: string, type: 'ok' | 'err') => {
    setNotification({ message: msg, type });
    if (type === 'ok') {
      setTimeout(() => {
        setNotification({ message: '', type: null });
      }, 4000);
    }
  };

  const cleanTransactions = (data: unknown): Transaction[] => {
    if (!Array.isArray(data)) return [];
    return data.filter(tx => 
      tx && 
      typeof tx === 'object' && 
      'date' in tx && typeof tx.date === 'string' && 
      'stock' in tx && typeof tx.stock === 'string' &&
      'action' in tx && (tx.action === 'BUY' || tx.action === 'SELL') &&
      'shares' in tx && typeof tx.shares === 'number' &&
      'price' in tx && typeof tx.price === 'number'
    ) as Transaction[];
  };

  const handleSeed = async (serviceInstance?: UpstashService) => {
    const service = serviceInstance || upstashServiceRef.current;
    if (!service) {
      throw new Error('Connect to Upstash database first.');
    }

    const seed: Transaction[] = [
      // Legacy positions (pre-reallocation)
      { id: 1,  date: '2021-01-01', stock: 'LCID', action: 'BUY',  shares: 25,  price: 296.10, total: 7402.50, notes: 'legacy position' },
      { id: 2,  date: '2021-01-01', stock: 'RIOT', action: 'BUY',  shares: 150, price: 48.01,  total: 7201.50, notes: 'legacy position' },
      { id: 3,  date: '2021-01-01', stock: 'MARA', action: 'BUY',  shares: 150, price: 30.07,  total: 4510.50, notes: 'legacy position' },
      { id: 4,  date: '2021-01-01', stock: 'ARKK', action: 'BUY',  shares: 60,  price: 119.30, total: 7158.00, notes: 'legacy position' },
      { id: 5,  date: '2021-01-01', stock: 'OPK',  action: 'BUY',  shares: 1,   price: 4.36,   total: 4.36,   notes: 'legacy position' },
      { id: 6,  date: '2021-01-01', stock: 'CLF',  action: 'BUY',  shares: 1,   price: 3.35,   total: 3.35,   notes: 'legacy position' },
      // Kept positions
      { id: 7,  date: '2023-06-16', stock: 'TSLA', action: 'BUY',  shares: 5,   price: 262.84, total: 1314.20, notes: '' },
      { id: 8,  date: '2023-06-16', stock: 'AMZN', action: 'BUY',  shares: 25,  price: 126.10, total: 3152.50, notes: '' },
      { id: 9,  date: '2023-06-16', stock: 'AAPL', action: 'BUY',  shares: 15,  price: 185.09, total: 2776.35, notes: '' },
      // Legacy sells (reallocation day Mar 4 2026)
      { id: 10, date: '2026-03-04', stock: 'LCID', action: 'SELL', shares: 25,  price: 10.22,  total: 255.50,  notes: 'tax loss harvest' },
      { id: 11, date: '2026-03-04', stock: 'RIOT', action: 'SELL', shares: 150, price: 16.69,  total: 2503.50, notes: 'tax loss harvest' },
      { id: 12, date: '2026-03-04', stock: 'MARA', action: 'SELL', shares: 150, price: 9.30,   total: 1395.00, notes: 'tax loss harvest' },
      { id: 13, date: '2026-03-04', stock: 'ARKK', action: 'SELL', shares: 60,  price: 75.14,  total: 4508.40, notes: 'tax loss harvest' },
      { id: 14, date: '2026-03-04', stock: 'OPK',  action: 'SELL', shares: 1,   price: 1.21,   total: 1.21,   notes: 'tax loss harvest' },
      { id: 15, date: '2026-03-04', stock: 'CLF',  action: 'SELL', shares: 1,   price: 10.91,  total: 10.91,  notes: 'tax loss harvest' },
      // Reallocation buys (Mar 4 2026)
      { id: 16, date: '2026-03-04', stock: 'NVDA', action: 'BUY',  shares: 19,  price: 182.76, total: 3472.44, notes: 'reallocation' },
      { id: 17, date: '2026-03-04', stock: 'QQQ',  action: 'BUY',  shares: 5,   price: 611.10, total: 3055.50, notes: 'reallocation' },
      { id: 18, date: '2026-03-04', stock: 'IBIT', action: 'BUY',  shares: 20,  price: 41.69,  total: 833.80,  notes: 'reallocation' },
      { id: 19, date: '2026-03-04', stock: 'SMH',  action: 'BUY',  shares: 5,   price: 399.50, total: 1997.50, notes: 'reallocation' },
      { id: 20, date: '2026-03-04', stock: 'SGOV', action: 'BUY',  shares: 20,  price: 100.41, total: 2008.20, notes: 'reallocation' },
      // Fresh capital buys (Apr 20 2026)
      { id: 21, date: '2026-04-20', stock: 'NVDA', action: 'BUY',  shares: 15,  price: 199.46, total: 2991.90, notes: 'fresh capital' },
      { id: 22, date: '2026-04-20', stock: 'QQQ',  action: 'BUY',  shares: 3,   price: 646.32, total: 1938.96, notes: 'fresh capital' },
      { id: 23, date: '2026-04-20', stock: 'SGOV', action: 'BUY',  shares: 19,  price: 100.58, total: 1911.02, notes: 'fresh capital' },
      { id: 24, date: '2026-04-20', stock: 'PLTR', action: 'BUY',  shares: 17,  price: 146.00, total: 2482.00, notes: 'limit order' },
      { id: 25, date: '2026-04-20', stock: 'PLTR', action: 'BUY',  shares: 4,   price: 145.46, total: 581.84,  notes: 'market order' },
      // May 2026
      { id: 26, date: '2026-05-23', stock: 'NVDA', action: 'BUY',  shares: 16,  price: 210.00, total: 3360.00, notes: 'limit order' },
    ];

    const ok = await service.set<Transaction[]>(TX_KEY, seed);
    if (ok) {
      setTransactions(seed);
      setLastSync(new Date().toLocaleTimeString());
      showNotification(`✓ Seeded ${seed.length} historical Robinhood transactions.`, 'ok');
    } else {
      throw new Error('Could not write seed data to Upstash.');
    }
  };

  const loadTransactions = async (serviceInstance?: UpstashService, autoSeedIfEmpty = false) => {
    const service = serviceInstance || upstashServiceRef.current;
    if (!service) return;

    setIsLoading(true);
    try {
      const data = await service.get<unknown[]>(TX_KEY);
      const cleaned = cleanTransactions(data);
      if (autoSeedIfEmpty && cleaned.length === 0) {
        showNotification('Database is empty or invalid. Auto-seeding Robinhood history...', 'ok');
        await handleSeed(service);
      } else {
        setTransactions(cleaned);
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Failed to load transactions: ${errMsg}`, 'err');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (url: string, token: string, autoSeed = true): Promise<boolean> => {
    const service = new UpstashService(url, token);
    const ok = await service.ping();
    
    if (ok) {
      upstashServiceRef.current = service;
      setIsConnected(true);
      setUpstashUrl(url);
      setUpstashToken(token);
      
      sessionStorage.setItem(UPSTASH_URL_KEY, url);
      sessionStorage.setItem(UPSTASH_TOKEN_KEY, token);
      
      setLastSync(new Date().toLocaleTimeString());
      showNotification('Successfully connected to Upstash Database!', 'ok');
      
      // Load transactions with auto-seed capability
      await loadTransactions(service, autoSeed);
      return true;
    } else {
      setIsConnected(false);
      showNotification('Upstash connection failed. Please check credentials.', 'err');
      return false;
    }
  };

  // Load market history (from cache or API)
  const loadMarketHistory = async (tickers: string[]) => {
    const service = upstashServiceRef.current;
    if (!service) return;

    const cacheKey = 'market_history';
    let cachedData: MarketHistoryCache | null = null;

    try {
      const cached = await service.get<{ lastUpdated: number; data: MarketHistoryCache }>(cacheKey);
      const cacheAgeLimit = 12 * 60 * 60 * 1000; // 12 hours
      console.log('[DEBUG] Retrieved cache from DB:', cached);

      if (cached && cached.data) {
        cachedData = cached.data;
        // Populate state with cached data immediately as placeholder/fallback
        setMarketHistory(cached.data);

        const hasAllTickers = tickers.every(t => cached.data[t.toUpperCase()]);
        const isFresh = Date.now() - cached.lastUpdated < cacheAgeLimit;
        console.log('[DEBUG] isFresh:', isFresh, 'hasAllTickers:', hasAllTickers, 'tickers:', tickers);

        if (isFresh && hasAllTickers) {
          console.log('[DEBUG] Using fresh and complete cache.');
          return;
        }
      }
    } catch (cacheErr) {
      console.warn('Failed to read market history cache from database:', cacheErr);
    }

    // Try to fetch fresh data
    try {
      console.log('[DEBUG] Fetching fresh stock data for:', tickers);
      const freshData = await fetchMultipleStocks(tickers);
      console.log('[DEBUG] Fresh data fetched:', freshData);
      
      const fetchedCount = Object.keys(freshData).length;
      if (fetchedCount > 0) {
        // Merge the fresh data with the existing cached data so we don't lose any tickers
        console.log('[DEBUG] Merging newly fetched stock data with existing DB cache.');
        const mergedData = {
          ...(cachedData || {}),
          ...freshData
        };

        setMarketHistory(mergedData);

        // Persist the merged (complete) cache in Upstash
        await service.set(cacheKey, {
          lastUpdated: Date.now(),
          data: mergedData
        });
        return;
      }
    } catch (fetchErr) {
      console.warn('Failed to fetch fresh stock data, falling back to cache:', fetchErr);
    }

    // Fallback to stale cached data if we have it
    if (cachedData) {
      console.log('[DEBUG] Falling back to stale/incomplete cache:', cachedData);
      setMarketHistory(cachedData);
    } else {
      console.error('[DEBUG] No market history cache available and fetch failed.');
    }
  };

  // Fetch/Load market price history when transactions change (holdings change)
  useEffect(() => {
    if (!isConnected || transactions.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMarketHistory({});
      return;
    }

    const holdings = computeHoldings(transactions);
    const activeTickers = Object.keys(holdings);
    if (activeTickers.length === 0) return;

    loadMarketHistory(activeTickers);
  }, [transactions, isConnected]);

  // Restore saved config on mount
  useEffect(() => {
    const savedUrl = sessionStorage.getItem(UPSTASH_URL_KEY) || '';
    const savedToken = sessionStorage.getItem(UPSTASH_TOKEN_KEY) || '';

    if (savedUrl && savedToken) {
      upstashServiceRef.current = new UpstashService(savedUrl, savedToken);
      
      // Auto-connect on mount (with auto-seed if empty)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleConnect(savedUrl, savedToken, true);
    } else {
      // If not connected, open the connection modal to prompt user
      setIsModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveTransaction = async (txData: Omit<Transaction, 'id' | 'total'>, id?: number): Promise<boolean> => {
    const service = upstashServiceRef.current;
    if (!service) return false;

    let updatedTxs: Transaction[];

    if (id !== undefined) {
      // Editing existing transaction
      const updatedTx: Transaction = {
        ...txData,
        id,
        total: parseFloat((txData.shares * txData.price).toFixed(2))
      };
      updatedTxs = transactions.map(t => t.id === id ? updatedTx : t);
    } else {
      // Creating new transaction
      const newTx: Transaction = {
        ...txData,
        id: Date.now(),
        total: parseFloat((txData.shares * txData.price).toFixed(2))
      };
      updatedTxs = [...transactions, newTx];
    }

    updatedTxs.sort((a, b) => a.date.localeCompare(b.date));
    
    try {
      const ok = await service.set<Transaction[]>(TX_KEY, updatedTxs);
      if (ok) {
        setTransactions(updatedTxs);
        setLastSync(new Date().toLocaleTimeString());
        showNotification(
          id !== undefined
            ? `✓ Updated transaction for ${txData.stock} successfully.`
            : `✓ Added transaction: ${txData.action} ${txData.shares} ${txData.stock} successfully.`,
          'ok'
        );
        setActiveTab('transactions');
        return true;
      }
      return false;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Failed to save transaction: ${errMsg}`, 'err');
      return false;
    }
  };

  const handleDeleteTransaction = async (id: number): Promise<void> => {
    const service = upstashServiceRef.current;
    if (!service) return;

    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    const filtered = transactions.filter(t => t.id !== id);
    try {
      const ok = await service.set<Transaction[]>(TX_KEY, filtered);
      if (ok) {
        setTransactions(filtered);
        setLastSync(new Date().toLocaleTimeString());
        showNotification('Transaction deleted.', 'ok');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Failed to delete transaction: ${errMsg}`, 'err');
    }
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem(UPSTASH_URL_KEY);
    sessionStorage.removeItem(UPSTASH_TOKEN_KEY);
    setUpstashUrl('');
    setUpstashToken('');
    setTransactions([]);
    setIsConnected(false);
    upstashServiceRef.current = null;
    showNotification('Disconnected from Upstash Database.', 'ok');
  };

  // Compute holdings
  const holdings = computeHoldings(transactions);

  return (
    <div className="container" style={{ paddingTop: 0 }}>
      {/* ── Sticky top bar: header + tabs ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        marginLeft: 'calc(-1 * var(--container-px, 24px))',
        marginRight: 'calc(-1 * var(--container-px, 24px))',
        paddingLeft: 'var(--container-px, 24px)',
        paddingRight: 'var(--container-px, 24px)',
        paddingTop: '12px',
        borderBottom: '1px solid var(--border)',
      }}>
        <Header 
          isConnected={isConnected} 
          lastSync={lastSync} 
          onOpenModal={() => setIsModalOpen(true)} 
        />

        {/* Navigation tabs (only when connected) */}
        {isConnected && (
          <div className="tabs" style={{ marginBottom: '12px' }}>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <LineChart size={14} />
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('holdings')}
              className={`tab ${activeTab === 'holdings' ? 'active' : ''}`}
            >
              <LayoutGrid size={14} />
              Holdings
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
            >
              <ListCollapse size={14} />
              Transactions
            </button>
          </div>
        )}
      </div>

      {/* Global Status Notifications */}
      {notification.type && (
        <div 
          className={`status show ${notification.type === 'ok' ? 'ok' : 'err'}`}
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            padding: '10px 14px',
            borderRadius: '8px',
            marginTop: '16px',
            marginBottom: '16px',
            transition: 'opacity 0.3s ease'
          }}
        >
          {notification.message}
        </div>
      )}

      {/* Page content */}
      {!isConnected ? (
        <HeroSection onConnectClick={() => setIsModalOpen(true)} />
      ) : (
        <div style={{ minHeight: '400px', paddingTop: '16px' }}>
          {activeTab === 'dashboard' && (
            <Dashboard 
              transactions={transactions} 
              holdings={holdings} 
              marketHistory={marketHistory}
            />
          )}
          {activeTab === 'transactions' && (
            <TransactionsTab 
              transactions={transactions} 
              onDeleteTransaction={handleDeleteTransaction}
              onRefresh={() => loadTransactions()}
              onAddClick={() => {
                setTransactionToEdit(null);
                setIsAddModalOpen(true);
              }}
              onEditClick={(tx) => {
                setTransactionToEdit(tx);
                setIsAddModalOpen(true);
              }}
              isLoading={isLoading}
              isConnected={isConnected}
            />
          )}
          {activeTab === 'holdings' && (
            <HoldingsTab 
              holdings={holdings} 
              isConnected={isConnected}
              marketHistory={marketHistory}
            />
          )}
        </div>
      )}

      {/* Modal Dialogs */}
      <ConnectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        isConnected={isConnected}
        savedUrl={upstashUrl}
        savedToken={upstashToken}
      />

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setTransactionToEdit(null);
        }}
        onSaveTransaction={handleSaveTransaction}
        isConnected={isConnected}
        transactionToEdit={transactionToEdit}
      />
    </div>
  );
};
