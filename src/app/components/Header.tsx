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

const navStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  background: T.cream,
  borderBottom: `1px solid ${T.border}`,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',   // equal thirds → logo is always centred
  alignItems: 'center',
  padding: '0 2.5rem',
  height: '60px',
};

const tabBarStyle: CSSProperties = {
  display: 'inline-flex',   // shrink-wrap the tabs, don't stretch to the full column
  gap: 0,
  alignItems: 'center',
  border: `1px solid ${T.border}`,
};

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
    height: '100%',
    lineHeight: '2.4',
  };
}

const logoStyle: CSSProperties = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '1rem',
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: T.green,
  userSelect: 'none',
  textAlign: 'center',   // centred within its equal-width column
};

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=DM+Mono:wght@400;700&display=swap');`}</style>
      <nav style={navStyle}>
        {/* Left — tabs */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={tabBarStyle}>
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

        {/* Center — logo */}
        <span style={logoStyle}>Weather Options</span>

        {/* Right — wallet */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
        </div>
      </nav>
    </>
  );
}