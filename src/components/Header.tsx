import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  lastSync: string;
  onOpenModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isConnected, lastSync, onOpenModal }) => {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: '12px',
      gap: '12px',
      flexWrap: 'nowrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', flexShrink: 0 }}>
        <h1 style={{
          fontSize: 'clamp(1.1rem, 4vw, 2.2rem)',
          color: 'var(--accent)',
          textShadow: '0 0 30px rgba(193, 255, 0, 0.3)',
          margin: 0,
          whiteSpace: 'nowrap',
        }}>
          AI Stock Helper
          <span style={{
            color: 'var(--muted)',
            fontSize: 'clamp(0.65rem, 2vw, 1rem)',
            fontFamily: 'var(--font-mono)',
            marginLeft: '8px',
            textShadow: 'none',
            letterSpacing: '0.05em'
          }}>
            v2.0.13
          </span>
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--muted)',
          whiteSpace: 'nowrap',
        }}>
          {lastSync ? lastSync : '—'}
        </div>

        <button 
          onClick={onOpenModal}
          className={`btn btn-secondary ${isConnected ? 'connected' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            border: '1px solid var(--border)',
            background: isConnected ? 'rgba(193, 255, 0, 0.05)' : 'transparent',
            color: isConnected ? 'var(--accent)' : 'var(--muted)',
            borderColor: isConnected ? 'var(--accent-dim)' : 'var(--border)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {isConnected ? (
              <Wifi size={13} className="color-pos" />
            ) : (
              <WifiOff size={13} className="color-neg" />
            )}
          </span>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.72rem',
            fontWeight: 500
          }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </button>
      </div>
    </header>
  );
};
