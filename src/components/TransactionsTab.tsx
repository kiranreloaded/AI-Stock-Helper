import React from 'react';
import { RefreshCw, Trash2, Plus, Pencil } from 'lucide-react';
import type { Transaction } from '../services/upstash';

interface TransactionsTabProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: number) => Promise<void>;
  onRefresh: () => Promise<void>;
  onAddClick: () => void;
  onEditClick: (tx: Transaction) => void;
  isLoading: boolean;
  isConnected: boolean;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  onDeleteTransaction,
  onRefresh,
  onAddClick,
  onEditClick,
  isLoading,
  isConnected
}) => {
  const validTx = transactions.filter(tx => tx && typeof tx === 'object' && typeof tx.date === 'string');
  const sorted = [...validTx].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="animate-fade-in">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text)', margin: 0 }}>Transaction Ledger</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={onAddClick}
            className="btn btn-primary"
            disabled={!isConnected}
            style={{
              fontSize: '0.72rem',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={12} />
            Add Transaction
          </button>
          <button 
            onClick={onRefresh}
            className="btn btn-secondary"
            disabled={isLoading || !isConnected}
            style={{
              fontSize: '0.72rem',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={12} className={isLoading ? 'pulse-slow' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: '60px' }}>#</th>
              <th>Date</th>
              <th>Stock</th>
              <th>Action</th>
              <th>Shares</th>
              <th>Price</th>
              <th>Total</th>
              <th>Notes</th>
              <th style={{ width: '60px', textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {!isConnected ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="color-muted pulse-slow" style={{ fontFamily: 'var(--font-mono)' }}>
                    Connect to Upstash to load transactions
                  </div>
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="color-muted pulse-slow" style={{ fontFamily: 'var(--font-mono)' }}>
                    Loading transactions ledger...
                  </div>
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '60px' }}>
                  <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📋</div>
                    No transactions yet.
                    <br />
                    Seed Robinhood data or add a transaction manually.
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((tx, index) => {
                const itemNum = sorted.length - index;
                const isBuy = tx.action === 'BUY';
                return (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{itemNum}</td>
                    <td style={{ fontWeight: 400 }}>{tx.date}</td>
                    <td>
                      <span style={{
                        color: 'var(--accent)',
                        fontWeight: 500,
                        letterSpacing: '0.05em'
                      }}>
                        {tx.stock}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${isBuy ? 'badge-buy' : 'badge-sell'}`}>
                        {tx.action}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {tx.shares.toString()}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      ${tx.price.toFixed(2)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                      ${tx.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                      {tx.notes || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => onEditClick(tx)}
                        className="btn btn-secondary"
                        title="Edit Transaction"
                        style={{
                          padding: '6px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '6px'
                        }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button 
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="btn btn-danger"
                        title="Delete Transaction"
                        style={{
                          padding: '6px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
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
