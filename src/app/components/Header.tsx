'use client';

import { CSSProperties } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const T = {
  cream:  '#f4ede0',
  green:  '#1c2b1e',
  amber:  '#c9913d',
  border: 'rgba(28,43,30,0.10)',
  muted:  '#4a5c4b',
};

type Tab = 'home' | 'create' | 'my-options' | 'liquidity';
interface HeaderProps { activeTab: Tab; setActiveTab: (tab: Tab) => void; }

const TABS: { key: Tab; label: string }[] = [
  { key: 'create',     label: 'Create'  },
  { key: 'my-options', label: 'Options' },
  { key: 'liquidity',  label: 'Pool'    },
];

function tabStyle(active: boolean, isLast: boolean): CSSProperties {
  return {
    padding: '0.45rem 1.1rem',
    fontSize: '0.7rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    fontFamily: "'DM Mono', monospace",
    fontWeight: active ? 700 : 400,
    color: active ? '#f4ede0' : T.muted,
    background: active ? T.green : 'transparent',
    border: 'none',
    borderRight: isLast ? 'none' : `1px solid ${T.border}`,
    cursor: 'pointer',
    transition: 'background 0.18s, color 0.18s',
    whiteSpace: 'nowrap',
    lineHeight: '2.4',
    flexShrink: 0,
  };
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=DM+Mono:wght@400;700&display=swap');

        .bruma-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: ${T.cream};
          border-bottom: 1px solid ${T.border};
        }

        /* ── Desktop: single row, 3-column grid ── */
        .bruma-nav-inner {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          align-items: center;
          padding: 0 2.5rem;
          height: 60px;
        }

        /* Desktop tabs: visible by default */
        .bruma-desktop-tabs {
          display: flex;
          align-items: center;
        }

        /* Mobile tab row: hidden by default */
        .bruma-tab-row {
          display: none;
        }

        .bruma-logo {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${T.green};
          user-select: none;
          text-align: center;
        }

        .bruma-tab-bar {
          display: inline-flex;
          gap: 0;
          align-items: center;
          border: 1px solid ${T.border};
        }

        .bruma-wallet {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        /* ── Mobile: two rows ── */
        @media (max-width: 640px) {
          .bruma-nav-inner {
            grid-template-columns: 1fr auto;
            grid-template-rows: auto auto;
            height: auto;
            padding: 0 1rem;
            gap: 0;
          }

          /* Hide desktop tab column */
          .bruma-desktop-tabs {
            display: none;
          }

          /* Logo: row 1, col 1 */
          .bruma-logo {
            text-align: left;
            padding: 0.85rem 0;
            grid-column: 1;
            grid-row: 1;
          }

          /* Wallet: row 1, col 2 */
          .bruma-wallet {
            grid-column: 2;
            grid-row: 1;
            padding: 0.5rem 0;
          }

          /* Tab strip: row 2, full width */
          .bruma-tab-row {
            display: flex;
            grid-column: 1 / -1;
            grid-row: 2;
            border-top: 1px solid ${T.border};
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .bruma-tab-row::-webkit-scrollbar { display: none; }

          .bruma-tab-row .bruma-tab-bar {
            display: flex;
            border: none;
            width: 100%;
          }

          .bruma-tab-row .bruma-tab-bar button {
            flex: 1;
            text-align: center;
            border-right: 1px solid ${T.border} !important;
            padding: 0.55rem 0.75rem !important;
          }

          .bruma-tab-row .bruma-tab-bar button:last-child {
            border-right: none !important;
          }
        }

        /* ── Tablet: tighten padding, smaller text ── */
        @media (min-width: 641px) and (max-width: 900px) {
          .bruma-nav-inner {
            padding: 0 1.25rem;
          }

          .bruma-tab-bar button {
            padding: 0.45rem 0.75rem !important;
            letter-spacing: 0.12em !important;
          }
        }
      `}</style>

      <nav className="bruma-nav">
        <div className="bruma-nav-inner">

          {/* ── Left: tabs — visible on desktop, hidden on mobile via CSS ── */}
          <div className="bruma-desktop-tabs">
            <div className="bruma-tab-bar">
              {TABS.map(({ key, label }, i) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={tabStyle(activeTab === key, i === TABS.length - 1)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Center / left-on-mobile: logo ── */}
          <span className="bruma-logo"
          onClick={() => setActiveTab('home')}
          style={{ cursor: 'pointer' }}
          >Bruma Protocol</span>

          {/* ── Right: wallet ── */}
          <div className="bruma-wallet">
            <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
          </div>

          {/* ── Mobile tab row (second row, hidden on desktop) ── */}
          <div className="bruma-tab-row">
            <div className="bruma-tab-bar">
              {TABS.map(({ key, label }, i) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={tabStyle(activeTab === key, i === TABS.length - 1)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </nav>
    </>
  );
}