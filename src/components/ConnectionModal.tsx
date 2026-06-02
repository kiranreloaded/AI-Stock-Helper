import React, { useState, useEffect } from 'react';
import { X, Key, Database, RefreshCw } from 'lucide-react';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (url: string, token: string) => Promise<boolean>;
  onDisconnect: () => void;
  isConnected: boolean;
  savedUrl: string;
  savedToken: string;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  onDisconnect,
  isConnected,
  savedUrl,
  savedToken
}) => {
  const [url, setUrl] = useState(savedUrl);
  const [token, setToken] = useState(savedToken);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'ok' | 'err' | 'loading' | null }>({
    text: '',
    type: null
  });

  useEffect(() => {
    setUrl(savedUrl);
    setToken(savedToken);
  }, [savedUrl, savedToken]);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !token.trim()) {
      setStatusMsg({ text: 'Please fill in both URL and token.', type: 'err' });
      return;
    }
    setStatusMsg({ text: 'Verifying connection...', type: 'loading' });
    
    const success = await onConnect(url, token);
    if (success) {
      setStatusMsg({ text: '✓ Connected successfully!', type: 'ok' });
      setTimeout(() => {
        setStatusMsg({ text: '', type: null });
        onClose();
      }, 1000);
    } else {
      setStatusMsg({ text: '✗ Connection failed. Verify credentials.', type: 'err' });
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
          maxWidth: '480px',
          padding: '28px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          border: '1px solid var(--border-glow)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '1.4rem',
            color: 'var(--accent)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Database size={18} />
            Upstash Connection
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

        <form onSubmit={handleConnect}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
            <label style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              color: 'var(--muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}>
              REST URL
            </label>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-db.upstash.io"
              className="form-input"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
            <label style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              color: 'var(--muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}>
              REST Token
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="your REST token"
                className="form-input"
                style={{ paddingLeft: '36px' }}
              />
              <Key 
                size={14} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--muted)' 
                }} 
              />
            </div>
          </div>

          {statusMsg.type && (
            <div 
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '20px',
                background: statusMsg.type === 'ok' 
                  ? 'var(--accent-dim)' 
                  : statusMsg.type === 'err' 
                    ? 'var(--red-dim)' 
                    : 'rgba(30, 30, 46, 0.4)',
                color: statusMsg.type === 'ok' 
                  ? 'var(--accent)' 
                  : statusMsg.type === 'err' 
                    ? 'var(--red)' 
                    : 'var(--text)',
                border: `1px solid ${statusMsg.type === 'ok' ? 'rgba(0,255,136,0.2)' : statusMsg.type === 'err' ? 'rgba(255,68,102,0.2)' : 'var(--border)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {statusMsg.type === 'loading' && <RefreshCw size={12} className="pulse-slow" />}
              {statusMsg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={statusMsg.type === 'loading'}
              style={{ flex: 1 }}
            >
              {isConnected ? 'Reconnect' : 'Connect'}
            </button>
            {isConnected && (
              <button 
                type="button" 
                onClick={() => {
                  onDisconnect();
                  onClose();
                }}
                className="btn btn-danger"
                disabled={statusMsg.type === 'loading'}
                style={{ flex: 1 }}
              >
                Disconnect
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
