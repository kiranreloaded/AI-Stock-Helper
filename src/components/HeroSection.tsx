import React from 'react';
import { Database, LineChart, Shield, Zap, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onConnectClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onConnectClick }) => {
  // Mock SVG coordinates to display a beautiful glowing trendline in the background/mockup
  const mockLinePoints = "M 0 120 Q 150 40 300 130 T 600 60 T 900 140 T 1200 30";

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '48px', margin: '20px 0 60px 0' }}>
      {/* Visual Banner Block */}
      <div 
        className="glass-panel" 
        style={{
          background: 'radial-gradient(circle at 10% 20%, rgba(193, 255, 0, 0.04) 0%, rgba(0, 0, 0, 0.95) 100%)',
          border: '1px solid rgba(193, 255, 0, 0.15)',
          padding: '60px 40px',
          position: 'relative',
          borderRadius: '24px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 20px 80px rgba(0, 0, 0, 0.8), 0 0 50px rgba(193, 255, 0, 0.03)'
        }}
      >
        {/* Decorative Grid Line */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          height: '150px',
          opacity: 0.15,
          pointerEvents: 'none',
          zIndex: 0
        }}>
          <svg viewBox="0 0 1200 200" width="100%" height="100%" preserveAspectRatio="none">
            <path 
              d={mockLinePoints} 
              fill="none" 
              stroke="var(--accent)" 
              strokeWidth="4" 
              strokeLinecap="round"
            />
            {/* Horizontal guidelines */}
            <line x1="0" y1="50" x2="1200" y2="50" stroke="rgba(255, 255, 255, 0.2)" strokeDasharray="5 5" />
            <line x1="0" y1="120" x2="1200" y2="120" stroke="rgba(255, 255, 255, 0.2)" strokeDasharray="5 5" />
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '720px' }}>
          {/* Version badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--accent-dim)',
            border: '1px solid rgba(193, 255, 0, 0.25)',
            borderRadius: '999px',
            padding: '6px 14px',
            marginBottom: '24px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--accent)',
            fontWeight: 500,
            letterSpacing: '0.05em'
          }}>
            <Zap size={12} />
            RELEASE V2.0 IS LIVE
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 7vw, 5.2rem)',
            lineHeight: '0.95',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            marginBottom: '20px',
            textShadow: '0 0 40px rgba(193, 255, 0, 0.15)'
          }}>
            Track Your Portfolio <br />
            <span style={{ color: 'var(--accent)' }}>In Legendary Style</span>
          </h1>

          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            color: '#a0a0c0',
            lineHeight: '1.6',
            fontWeight: 300,
            marginBottom: '36px',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
          }}>
            A high-fidelity stock tracking dashboard inspired by the sleek, dark look of Robinhood Legend. 
            Connect your Upstash Redis database to safely store transactions, view positions cost-basis, 
            and analyze performance metrics in real-time.
          </p>

          <button 
            onClick={onConnectClick}
            className="btn btn-primary"
            style={{
              padding: '16px 36px',
              fontSize: '0.95rem',
              borderRadius: '999px',
              fontWeight: 700,
              gap: '12px',
              boxShadow: '0 10px 30px rgba(193, 255, 0, 0.3)',
              transform: 'scale(1)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(193, 255, 0, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(193, 255, 0, 0.3)';
            }}
          >
            Connect Upstash Database
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Highlights Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px'
      }}>
        <div className="glass-panel" style={{ background: '#000000', border: '1px solid var(--border)', padding: '32px' }}>
          <div style={{
            color: 'var(--accent)',
            marginBottom: '16px',
            display: 'inline-flex',
            padding: '12px',
            background: 'var(--accent-dim)',
            borderRadius: '12px'
          }}>
            <Database size={24} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '8px', fontFamily: 'var(--font-sans)', fontWeight: 700, letterSpacing: 'normal', textTransform: 'none' }}>
            Upstash Redis Persistence
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
            Experience secure cloud storage with low-latency REST connection. Your transaction ledger is saved in real-time, persisting edits and deletions instantly.
          </p>
        </div>

        <div className="glass-panel" style={{ background: '#000000', border: '1px solid var(--border)', padding: '32px' }}>
          <div style={{
            color: 'var(--accent)',
            marginBottom: '16px',
            display: 'inline-flex',
            padding: '12px',
            background: 'var(--accent-dim)',
            borderRadius: '12px'
          }}>
            <LineChart size={24} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '8px', fontFamily: 'var(--font-sans)', fontWeight: 700, letterSpacing: 'normal', textTransform: 'none' }}>
            Chronological Cost-Basis
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
            Visualizes historical book valuation data on an edge-to-edge chart. Math utilities reduce cost basis proportionally on sells to compute accurate positions.
          </p>
        </div>

        <div className="glass-panel" style={{ background: '#000000', border: '1px solid var(--border)', padding: '32px' }}>
          <div style={{
            color: 'var(--accent)',
            marginBottom: '16px',
            display: 'inline-flex',
            padding: '12px',
            background: 'var(--accent-dim)',
            borderRadius: '12px'
          }}>
            <Shield size={24} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '8px', fontFamily: 'var(--font-sans)', fontWeight: 700, letterSpacing: 'normal', textTransform: 'none' }}>
            Authentic Metrics Ledger
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
            No fake data simulation or wiggling. Displays actual book-value performance, realized P&L on closed positions, and holdings average cost based on true records.
          </p>
        </div>
      </div>
    </div>
  );
};
