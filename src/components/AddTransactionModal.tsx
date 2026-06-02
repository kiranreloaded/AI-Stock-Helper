import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Info, Pencil } from 'lucide-react';
import type { Transaction } from '../services/upstash';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'total'>, id?: number) => Promise<boolean>;
  isConnected: boolean;
  transactionToEdit?: Transaction | null;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSaveTransaction,
  isConnected,
  transactionToEdit
}) => {
  const [date, setDate] = useState('');
  const [ticker, setTicker] = useState('');
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default date or populate values when modal opens/changes
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setDate(transactionToEdit.date);
        setTicker(transactionToEdit.stock);
        setAction(transactionToEdit.action);
        setShares(transactionToEdit.shares.toString());
        setPrice(transactionToEdit.price.toString());
        setNotes(transactionToEdit.notes || '');
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setTicker('');
        setAction('BUY');
        setShares('');
        setPrice('');
        setNotes('');
      }
      setErrorMsg('');
    }
  }, [isOpen, transactionToEdit]);

  if (!isOpen) return null;

  const total = (parseFloat(shares) || 0) * (parseFloat(price) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isConnected) {
      setErrorMsg('Upstash must be connected before saving transactions.');
      return;
    }

    if (!date) {
      setErrorMsg('Please select a valid date.');
      return;
    }

    const cleanTicker = ticker.trim().toUpperCase();
    if (!cleanTicker) {
      setErrorMsg('Ticker cannot be empty.');
      return;
    }

    const numShares = parseFloat(shares);
    if (isNaN(numShares) || numShares <= 0) {
      setErrorMsg('Shares must be a positive number.');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setErrorMsg('Price per share must be a positive number.');
      return;
    }

    setIsSubmitting(true);
    const success = await onSaveTransaction({
      date,
      stock: cleanTicker,
      action,
      shares: numShares,
      price: numPrice,
      notes: notes.trim()
    }, transactionToEdit?.id);

    setIsSubmitting(false);

    if (success) {
      onClose();
    } else {
      setErrorMsg('Failed to save transaction. Try again.');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 3, 5, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '540px',
          padding: '28px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          border: '1px solid var(--border-glow)',
          background: 'var(--surface-solid)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            color: 'var(--accent)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {transactionToEdit ? <Pencil size={18} /> : <PlusCircle size={18} />}
            {transactionToEdit ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              padding: '6px',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                Date
              </label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                Ticker
              </label>
              <input 
                type="text" 
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="e.g. NVDA"
                className="form-input"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                Action
              </label>
              <select 
                value={action}
                onChange={(e) => setAction(e.target.value as 'BUY' | 'SELL')}
                className="form-input form-select"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                Shares
              </label>
              <input 
                type="number" 
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="10"
                step="0.0001"
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                Price Per Share
              </label>
              <input 
                type="number" 
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150.00"
                step="0.01"
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                Notes (optional)
              </label>
              <input 
                type="text" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. limit order"
                className="form-input"
              />
            </div>
          </div>

          {errorMsg && (
            <div 
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '20px',
                background: 'var(--red-dim)',
                color: 'var(--red)',
                border: '1px solid rgba(255, 68, 102, 0.2)'
              }}
            >
              {errorMsg}
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            borderTop: '1px solid var(--border)',
            paddingTop: '20px'
          }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting || !isConnected}
              style={{ minWidth: '160px' }}
            >
              {isSubmitting ? 'Saving...' : (transactionToEdit ? 'Save Changes' : 'Save Transaction')}
            </button>

            {total > 0 && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.02)',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <Info size={14} className="color-pos" />
                Preview Total:{' '}
                <span className="color-pos" style={{ fontWeight: 500 }}>
                  ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
