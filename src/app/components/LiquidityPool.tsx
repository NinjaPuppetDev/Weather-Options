'use client';

import { useState, useEffect, useMemo, CSSProperties } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { VAULT_ABI, WETH_ABI, WEATHER_OPTION_ABI, CONTRACTS } from '../lib/contract';
import type { Abi } from 'viem';

// ─── Design tokens (unchanged from existing Bruma palette) ──────────────────
const T = {
  cream:        '#f4ede0',
  green:        '#1c2b1e',
  greenMid:     '#2d4a30',
  muted:        '#4a5c4b',
  textMuted:    '#6b6560',
  amber:        '#c9913d',
  amberLight:   'rgba(201,145,61,0.08)',
  amberBorder:  'rgba(201,145,61,0.2)',
  border:       'rgba(28,43,30,0.10)',
  white:        '#ffffff',
  successBg:    '#f0f7f1',
  successBorder:'#a8c9ac',
  successText:  '#14532d',
  errorBg:      '#fef2f0',
  errorBorder:  '#e8b4ad',
  errorText:    '#7c2d12',
  warnBg:       '#fdfaee',
  warnBorder:   '#e8d5a3',
  warnText:     '#78350f',
};

const RESPONSIVE = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Mono:wght@400;700&display=swap');
  input:focus { border-color: ${T.amber} !important; outline: none; }

  .lp-metrics-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1px; background: ${T.border};
  }
  .lp-secondary-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1px; background: ${T.border}; border-top: 1px solid ${T.border};
  }
  .lp-pos-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1px; background: ${T.border}; border-top: 1px solid ${T.border};
  }
  .lp-panel-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1px; background: ${T.border}; border-top: 1px solid ${T.border};
  }
  .lp-how-grid {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 1px; background: ${T.border}; border-top: 1px solid ${T.border};
  }
  .lp-secondary-cell {
    background: ${T.cream}; padding: 1rem 2rem;
    display: flex; justify-content: space-between; align-items: center;
  }

  /* ── Dashboard additions ── */
  .dash-loc-grid {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 1px; background: ${T.border};
  }
  .dash-oi-table { width: 100%; border-collapse: collapse; }
  .dash-oi-table th {
    font-size: 0.62rem; letter-spacing: 0.22em; text-transform: uppercase;
    color: ${T.amber}; font-family: 'DM Mono', monospace; font-weight: 700;
    padding: 0.6rem 1rem; text-align: left; border-bottom: 1px solid ${T.border};
    background: ${T.cream};
  }
  .dash-oi-table td {
    font-size: 0.82rem; font-family: 'DM Mono', monospace;
    color: ${T.green}; padding: 0.75rem 1rem;
    border-bottom: 1px solid ${T.border};
    vertical-align: middle;
  }
  .dash-oi-row:hover td { background: ${T.amberLight}; }
  .dash-oi-table td:first-child { color: ${T.textMuted}; }
  .dash-pill {
    display: inline-block; font-size: 0.6rem; letter-spacing: 0.15em;
    font-family: 'DM Mono', monospace; font-weight: 700; text-transform: uppercase;
    padding: 0.15rem 0.45rem; border: 1px solid currentColor;
  }
  .dash-pill-call { color: ${T.greenMid}; border-color: rgba(45,74,48,0.4); background: ${T.successBg}; }
  .dash-pill-put  { color: ${T.warnText}; border-color: ${T.warnBorder}; background: ${T.warnBg}; }

  @keyframes barGrow {
    from { width: 0; }
    to   { width: var(--bar-w); }
  }
  .bar-fill { animation: barGrow 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }

  @media (max-width: 768px) {
    .lp-metrics-grid, .lp-secondary-grid, .lp-panel-grid { grid-template-columns: 1fr; }
    .lp-secondary-cell { padding: 0.85rem 1.25rem; }
    .dash-loc-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 560px) {
    .lp-pos-grid, .lp-how-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .dash-oi-table th:nth-child(n+4),
    .dash-oi-table td:nth-child(n+4) { display: none; }
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function actionBtn(variant: 'primary' | 'amber' | 'ghost' | 'disabled'): CSSProperties {
  const map = {
    primary:  { bg: T.green, color: '#f4ede0', cursor: 'pointer' },
    amber:    { bg: T.amber, color: T.green,   cursor: 'pointer' },
    ghost:    { bg: 'transparent', color: T.muted, cursor: 'pointer' },
    disabled: { bg: 'rgba(28,43,30,0.1)', color: T.textMuted, cursor: 'not-allowed' },
  };
  const v = map[variant];
  return {
    width: '100%', padding: '0.9rem 1.25rem',
    background: v.bg, color: v.color,
    border: variant === 'ghost' ? `1px solid ${T.border}` : 'none',
    fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase',
    fontWeight: 700, cursor: v.cursor,
    fontFamily: "'DM Mono', monospace",
    transition: 'background 0.18s', marginBottom: '0.5rem',
  };
}

function alertBox(variant: 'success' | 'error'): CSSProperties {
  const ok = variant === 'success';
  return {
    padding: '0.9rem 1.25rem',
    background: ok ? T.successBg : T.errorBg,
    border: `1px solid ${ok ? T.successBorder : T.errorBorder}`,
    marginBottom: '1rem', fontSize: '0.85rem',
    color: ok ? T.successText : T.errorText,
  };
}

function fmtExpiry(ts: bigint): string {
  const now   = Math.floor(Date.now() / 1000);
  const delta = Number(ts) - now;
  if (delta <= 0) return 'Expired';
  const d = Math.floor(delta / 86400);
  const h = Math.floor((delta % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

function fmtCoord(lat: string, lon: string): string {
  return `${Number(lat).toFixed(2)}°, ${Number(lon).toFixed(2)}°`;
}

// Known location names for display
const KNOWN_LOCATIONS: Record<string, string> = {
  '6.25,-75.56':    'Medellín',
  '51.51,-0.13':    'London',
  '25.76,-80.19':   'Miami',
  '40.71,-74.01':   'New York',
  '35.68,139.69':   'Tokyo',
  '48.86,2.35':     'Paris',
  '-33.87,151.21':  'Sydney',
};

function resolveLocationName(lat: string, lon: string): string {
  const key = `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
  return KNOWN_LOCATIONS[key] ?? fmtCoord(lat, lon);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const css: Record<string, CSSProperties> = {
  root:        { fontFamily: "'Cormorant Garamond', Georgia, serif" },
  topBar:      { height: 3, background: `linear-gradient(90deg, ${T.amber}, ${T.greenMid})` },
  wrap:        { background: T.cream, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: '1.25rem' },
  header:      { padding: '2rem 2.5rem', borderBottom: `1px solid ${T.border}` },
  headerTitle: { fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 400, color: T.green, lineHeight: 1.1, marginBottom: '0.3rem' },
  headerSub:   { fontSize: '0.82rem', color: T.textMuted, letterSpacing: '0.08em', fontFamily: "'DM Mono', monospace" },
  label:       { fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", marginBottom: '0.5rem', display: 'block' },
  metricCell:  { padding: '1.5rem 2rem', background: T.white },
  metricLabel: { fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", marginBottom: '0.4rem', display: 'block' },
  metricValue: { fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', fontWeight: 400, color: T.green, fontFamily: "'Cormorant Garamond', Georgia, serif" },
  metricSub:   { fontSize: '0.72rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginTop: '0.2rem' },
  secondaryLabel: { fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace" },
  secondaryValue: { fontSize: '0.95rem', fontFamily: "'DM Mono', monospace", color: T.green },
  posCell:     { background: T.white, padding: '1.25rem 2rem' },
  posLabel:    { fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: '0.35rem', display: 'block' },
  posValue:    { fontSize: '1.4rem', fontWeight: 400, color: T.green, fontFamily: "'Cormorant Garamond', Georgia, serif" },
  panel:       { padding: '2rem 2rem 2.5rem', background: T.cream },
  panelLabel:  { fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", marginBottom: '0.5rem', display: 'block' },
  panelTitle:  { fontSize: '1.2rem', fontWeight: 500, color: T.green, marginBottom: '1.25rem' },
  noteBox:     { padding: '1rem', background: T.amberLight, border: `1px solid ${T.amberBorder}`, marginBottom: '1.25rem', fontSize: '0.82rem', color: T.muted, lineHeight: 1.7 },
  noteTitle:   { fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '0.5rem' },
  input:       { width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${T.border}`, background: T.white, outline: 'none', fontSize: '1rem', color: T.green, fontFamily: "'Cormorant Garamond', Georgia, serif", boxSizing: 'border-box', marginBottom: '1rem', transition: 'border-color 0.2s' },
  maxNote:     { fontSize: '0.72rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: '1rem', marginTop: '-0.5rem' },
  howCell:     { padding: '2rem', background: T.white },
  howIcon:     { fontSize: '1.5rem', marginBottom: '0.75rem' },
  howTitle:    { fontSize: '1rem', fontWeight: 600, color: T.green, marginBottom: '0.5rem' },
  howDesc:     { fontSize: '0.88rem', color: T.muted, lineHeight: 1.75 },
};

// ─── UtilizationBar ──────────────────────────────────────────────────────────
function UtilizationBar({ bps, max = 10000 }: { bps: number; max?: number }) {
  const pct     = Math.min((bps / max) * 100, 100);
  const danger  = bps > 7000;
  const warning = bps > 5000;
  const color   = danger ? T.errorText : warning ? T.warnText : T.successText;

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.68rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: '0.12em' }}>
          UTILIZED
        </span>
        <span style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color, fontWeight: 700 }}>
          {(bps / 100).toFixed(1)}% / 80%
        </span>
      </div>
      <div style={{ height: 6, background: T.border, position: 'relative', overflow: 'hidden' }}>
        {/* 80% cap marker */}
        <div style={{ position: 'absolute', left: '80%', top: 0, bottom: 0, width: 1, background: T.amber, zIndex: 2 }} />
        {/* Fill */}
        <div
          className="bar-fill"
          style={{
            height: '100%', background: color,
            ['--bar-w' as string]: `${pct}%`,
            width: `${pct}%`,
            transition: 'background 0.3s',
          }}
        />
      </div>
    </div>
  );
}

// ─── LocationBar ─────────────────────────────────────────────────────────────
function LocationBar({
  name, exposurePct, maxBps, count,
}: {
  name: string; exposurePct: number; maxBps: number; count: number;
}) {
  const pct       = Math.min(exposurePct, 100);
  const nearLimit = exposurePct > (maxBps / 100) * 0.8;
  const overLimit = exposurePct > maxBps / 100;
  const color     = overLimit ? T.errorText : nearLimit ? T.warnText : T.greenMid;

  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.88rem', color: T.green, fontWeight: 500 }}>{name}</span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>
            {count} option{count !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color, fontWeight: 700 }}>
            {exposurePct.toFixed(1)}%
          </span>
        </div>
      </div>
      <div style={{ height: 5, background: T.border, position: 'relative', overflow: 'hidden' }}>
        {/* 20% max marker */}
        <div style={{ position: 'absolute', left: `${Math.min((maxBps / 100), 100)}%`, top: 0, bottom: 0, width: 1, background: T.amberBorder, zIndex: 2 }} />
        <div
          className="bar-fill"
          style={{
            height: '100%', background: color,
            ['--bar-w' as string]: `${pct}%`,
            width: `${pct}%`,
          }}
        />
      </div>
    </div>
  );
}

// ─── OpenInterestTable ───────────────────────────────────────────────────────
type OptionData = {
  tokenId: number;
  optionType: number;
  latitude: string;
  longitude: string;
  expiryDate: bigint;
  strikeMM: bigint;
  spreadMM: bigint;
  notional: bigint;
  status: number;
};

function OpenInterestTable({ options }: { options: OptionData[] }) {
  if (options.length === 0) {
    return (
      <div style={{ padding: '2.5rem', textAlign: 'center', color: T.textMuted, fontSize: '0.88rem', fontFamily: "'DM Mono', monospace" }}>
        No active options on-chain.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="dash-oi-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Type</th>
            <th>Location</th>
            <th>Strike / Spread</th>
            <th>Max payout</th>
            <th>Expires</th>
          </tr>
        </thead>
        <tbody>
          {options.map((o) => {
            const maxPayout = o.spreadMM * o.notional;
            const isCall    = o.optionType === 0;
            return (
              <tr key={o.tokenId} className="dash-oi-row">
                <td style={{ color: T.textMuted }}>{o.tokenId}</td>
                <td>
                  <span className={`dash-pill ${isCall ? 'dash-pill-call' : 'dash-pill-put'}`}>
                    {isCall ? '☔ Call' : '☀ Put'}
                  </span>
                </td>
                <td>{resolveLocationName(o.latitude, o.longitude)}</td>
                <td>{Number(o.strikeMM)}mm / {Number(o.spreadMM)}mm</td>
                <td style={{ color: T.greenMid }}>{formatEther(maxPayout)} ETH</td>
                <td style={{ color: Number(o.expiryDate) < Date.now() / 1000 + 86400 ? T.warnText : T.green }}>
                  {fmtExpiry(o.expiryDate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── RiskDashboard ────────────────────────────────────────────────────────────
function RiskDashboard({ tvl, utilizationBps }: { tvl: bigint; utilizationBps: bigint }) {
  // 1. Fetch active option IDs
  const { data: activeIds } = useReadContract({
    address: CONTRACTS.WEATHER_OPTION,
    abi: WEATHER_OPTION_ABI,
    functionName: 'getActiveOptions',
    query: { refetchInterval: 15000 },
  });

  const ids = (activeIds as bigint[] | undefined) ?? [];

  // 2. Fetch vault locationExposure for each unique location key
  //    and full option data for each token
  const optionContracts = ids.map((id) => ({
    address: CONTRACTS.WEATHER_OPTION as `0x${string}`,
    abi: WEATHER_OPTION_ABI,
    functionName: 'getOption' as const,
    args: [id],
  }));

 const { data: optionResults } = useReadContracts({
  contracts: optionContracts as readonly {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
  }[],
  query: { enabled: ids.length > 0, refetchInterval: 15000 },
});

  // 3. Parse option data
  const options = useMemo<OptionData[]>(() => {
    if (!optionResults) return [];
    return optionResults
      .map((r, i) => {
        if (r.status !== 'success' || !r.result) return null;
        const opt = r.result as {
          tokenId: bigint;
          terms: {
            optionType: number;
            latitude: string;
            longitude: string;
            expiryDate: bigint;
            strikeMM: bigint;
            spreadMM: bigint;
            notional: bigint;
          };
          state: { status: number };
        };
        return {
          tokenId:    Number(opt.tokenId ?? ids[i]),
          optionType: Number(opt.terms.optionType),
          latitude:   opt.terms.latitude,
          longitude:  opt.terms.longitude,
          expiryDate: opt.terms.expiryDate,
          strikeMM:   opt.terms.strikeMM,
          spreadMM:   opt.terms.spreadMM,
          notional:   opt.terms.notional,
          status:     Number(opt.state.status),
        } as OptionData;
      })
      .filter((o): o is OptionData => o !== null);
  }, [optionResults, ids]);

  // 4. Aggregate location exposure from option data
  const locationStats = useMemo(() => {
    const map = new Map<string, { name: string; exposure: bigint; count: number }>();
    for (const o of options) {
      const key  = `${Number(o.latitude).toFixed(2)},${Number(o.longitude).toFixed(2)}`;
      const name = resolveLocationName(o.latitude, o.longitude);
      const max  = o.spreadMM * o.notional;
      const prev = map.get(key) ?? { name, exposure: BigInt(0), count: 0 };
      map.set(key, { name, exposure: prev.exposure + max, count: prev.count + 1 });
    }
    return Array.from(map.values()).sort((a, b) => (a.exposure > b.exposure ? -1 : 1));
  }, [options]);

  const totalOpenInterest = useMemo(
    () => options.reduce((acc, o) => acc + o.spreadMM * o.notional, BigInt(0)),
    [options]
  );

  const tvlNum = Number(tvl);

  return (
    <>
      {/* ── Open Interest ────────────────────────────────────── */}
      <div style={css.wrap}>
        <div style={css.header}>
          <span style={css.label}>Live positions</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ ...css.headerTitle, marginBottom: 0 }}>Open interest</h2>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                Total at risk
              </div>
              <div style={{ fontSize: '1.4rem', color: T.green, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                {formatEther(totalOpenInterest)} ETH
              </div>
            </div>
          </div>
          <p style={css.headerSub}>{options.length} active option{options.length !== 1 ? 's' : ''} — data read from on-chain</p>
        </div>

        <OpenInterestTable options={options} />
      </div>

      {/* ── Location Concentration ───────────────────────────── */}
      <div style={css.wrap}>
        <div style={css.header}>
          <span style={css.label}>Risk concentration</span>
          <h2 style={css.headerTitle}>Exposure by location</h2>
          <p style={css.headerSub}>20% per-location cap · amber line = limit</p>
        </div>

        {locationStats.length === 0 ? (
          <div style={{ padding: '2rem 2.5rem', color: T.textMuted, fontSize: '0.88rem', fontFamily: "'DM Mono', monospace" }}>
            No active exposure.
          </div>
        ) : (
          <div style={{ padding: '1.75rem 2.5rem' }}>
            {locationStats.map((loc) => {
              const exposurePct = tvlNum > 0
                ? (Number(loc.exposure) / tvlNum) * 100
                : 0;
              return (
                <LocationBar
                  key={loc.name}
                  name={loc.name}
                  exposurePct={exposurePct}
                  maxBps={2000}
                  count={loc.count}
                />
              );
            })}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>
              <span>Utilization across all locations</span>
              <span style={{ color: T.green, fontWeight: 700 }}>
                {tvlNum > 0 ? ((Number(totalOpenInterest) / tvlNum) * 100).toFixed(1) : '0.0'}% of TVL
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LiquidityPool() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted]   = useState(false);
  const [depositAmount, setDepositAmount]   = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [needsApproval, setNeedsApproval]   = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'risk'>('overview');

  useEffect(() => { setMounted(true); }, []);

  const { data: metricsData, refetch: refetchMetrics }     = useReadContract({ address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'getMetrics',    query: { enabled: mounted && isConnected } });
  const { data: lpBalance,   refetch: refetchLPBalance }   = useReadContract({ address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'balanceOf',     args: address ? [address] : undefined, query: { enabled: mounted && isConnected && !!address } });
  const { data: wethBalance, refetch: refetchWETH }        = useReadContract({ address: CONTRACTS.WETH,  abi: WETH_ABI,  functionName: 'balanceOf',     args: address ? [address] : undefined, query: { enabled: mounted && isConnected && !!address } });
  const { data: wethAllowance, refetch: refetchAllowance } = useReadContract({ address: CONTRACTS.WETH,  abi: WETH_ABI,  functionName: 'allowance',     args: address ? [address, CONTRACTS.VAULT] : undefined, query: { enabled: mounted && isConnected && !!address } });
  const { data: maxWithdraw }                              = useReadContract({ address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'maxWithdraw',   args: address ? [address] : undefined, query: { enabled: mounted && isConnected && !!address } });

  const { writeContract: wrapETH,  data: wrapHash    } = useWriteContract();
  const { writeContract: approve,  data: approveHash  } = useWriteContract();
  const { writeContract: deposit,  data: depositHash,  error: depositError  } = useWriteContract();
  const { writeContract: withdraw, data: withdrawHash, error: withdrawError } = useWriteContract();

  const { isLoading: isWrapping,        isSuccess: isWrapSuccess     } = useWaitForTransactionReceipt({ hash: wrapHash     });
  const { isLoading: isApproving,       isSuccess: isApproveSuccess  } = useWaitForTransactionReceipt({ hash: approveHash  });
  const { isLoading: isDepositPending,  isSuccess: isDepositSuccess  } = useWaitForTransactionReceipt({ hash: depositHash  });
  const { isLoading: isWithdrawPending, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });

  useEffect(() => {
    if (depositAmount && wethAllowance !== undefined) {
      try { setNeedsApproval(parseEther(depositAmount) > (wethAllowance as bigint)); } catch { /* invalid */ }
    }
  }, [depositAmount, wethAllowance]);

  useEffect(() => {
    if (isWrapSuccess || isApproveSuccess || isDepositSuccess || isWithdrawSuccess) {
      setTimeout(() => { refetchMetrics(); refetchLPBalance(); refetchWETH(); refetchAllowance(); }, 2000);
    }
  }, [isWrapSuccess, isApproveSuccess, isDepositSuccess, isWithdrawSuccess, refetchMetrics, refetchLPBalance, refetchWETH, refetchAllowance]);

  const handleWrapETH  = () => { if (!depositAmount)          return; wrapETH ({ address: CONTRACTS.WETH,  abi: WETH_ABI,  functionName: 'deposit', value: parseEther(depositAmount) }); };
  const handleApprove  = () => { if (!depositAmount)          return; approve ({ address: CONTRACTS.WETH,  abi: WETH_ABI,  functionName: 'approve', args: [CONTRACTS.VAULT, parseEther(depositAmount)] }); };
  const handleDeposit  = () => { if (!depositAmount || !address) return; deposit({ address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'deposit', args: [parseEther(depositAmount), address] }); setDepositAmount(''); };
  const handleWithdraw = () => { if (!withdrawAmount || !address) return; withdraw({ address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'withdraw', args: [parseEther(withdrawAmount), address, address] }); setWithdrawAmount(''); };

  if (!mounted) return null;

  if (!isConnected) {
    return (
      <div style={{ ...css.wrap, textAlign: 'center', padding: '5rem 2.5rem' }}>
        <style>{RESPONSIVE}</style>
        <div style={css.topBar} />
        <div style={{ fontSize: '2.5rem', marginBottom: '1.25rem' }}>💧</div>
        <h2 style={{ ...css.headerTitle, marginBottom: '0.5rem' }}>Liquidity Pool</h2>
        <p style={{ fontSize: '0.9rem', color: T.textMuted }}>Connect your wallet to provide or manage liquidity.</p>
      </div>
    );
  }

  const metrics     = metricsData as [bigint, bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
  const [tvl, locked, available, utilization, premiums, payouts, netPnL] = metrics ?? Array(7).fill(BigInt(0)) as bigint[];
  const netPositive = (netPnL as bigint) >= BigInt(0);

  // ── Tab nav styles ──────────────────────────────────────────────────────
  const tabStyle = (active: boolean): CSSProperties => ({
    padding: '0.65rem 1.5rem',
    background: active ? T.green : 'transparent',
    color: active ? T.cream : T.muted,
    border: 'none',
    fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase',
    fontFamily: "'DM Mono', monospace", fontWeight: 700,
    cursor: 'pointer', transition: 'background 0.18s, color 0.18s',
  });

  return (
    <div style={css.root}>
      <style>{RESPONSIVE}</style>

      {/* ── Tab switcher ───────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', gap: 1, background: T.border }}>
        <button style={tabStyle(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>
          Pool overview
        </button>
        <button style={tabStyle(activeTab === 'risk')} onClick={() => setActiveTab('risk')}>
          Risk dashboard
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* ── Pool metrics ───────────────────────────────────────── */}
          <div style={css.wrap}>
            <div style={css.topBar} />
            <div style={css.header}>
              <span style={css.label}>Liquidity Pool</span>
              <h2 style={css.headerTitle}>ERC-4626 vault overview</h2>
              <p style={css.headerSub}>Chainlink-automated, 80% max utilization</p>
            </div>

            <div className="lp-metrics-grid">
              {[
                { label: 'Total value locked',  value: `${formatEther(tvl as bigint)} ETH`,       sub: 'vault TVL' },
                { label: 'Available liquidity', value: `${formatEther(available as bigint)} ETH`, sub: `${formatEther(locked as bigint)} ETH locked` },
                { label: 'Utilization rate',    value: `${Number(utilization as bigint) / 100}%`, sub: '80% maximum' },
              ].map(({ label, value, sub }) => (
                <div key={label} style={css.metricCell}>
                  <span style={css.metricLabel}>{label}</span>
                  <div style={css.metricValue}>{value}</div>
                  <div style={css.metricSub}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Utilization bar */}
            <div style={{ padding: '1.25rem 2rem', borderTop: `1px solid ${T.border}`, background: T.white }}>
              <UtilizationBar bps={Number(utilization as bigint)} />
            </div>

            <div className="lp-secondary-grid">
              <div className="lp-secondary-cell">
                <span style={css.secondaryLabel}>Total premiums earned</span>
                <span style={{ ...css.secondaryValue, color: T.successText }}>+{formatEther(premiums as bigint)} ETH</span>
              </div>
              <div className="lp-secondary-cell">
                <span style={css.secondaryLabel}>Total payouts made</span>
                <span style={{ ...css.secondaryValue, color: T.errorText }}>−{formatEther(payouts as bigint)} ETH</span>
              </div>
              <div className="lp-secondary-cell">
                <span style={css.secondaryLabel}>Net P&amp;L</span>
                <span style={{ ...css.secondaryValue, color: netPositive ? T.successText : T.errorText }}>
                  {netPositive ? '+' : '−'}{formatEther(netPositive ? (netPnL as bigint) : -(netPnL as bigint))} ETH
                </span>
              </div>
            </div>
          </div>

          {/* ── User position + actions ─────────────────────────────── */}
          <div style={css.wrap}>
            <div style={css.header}>
              <span style={css.label}>Your position</span>
              <h2 style={css.headerTitle}>Manage liquidity</h2>
            </div>

            <div className="lp-pos-grid">
              <div style={css.posCell}>
                <span style={css.posLabel}>LP tokens held</span>
                <div style={css.posValue}>{lpBalance ? formatEther(lpBalance as bigint) : '0'}</div>
              </div>
              <div style={css.posCell}>
                <span style={css.posLabel}>WETH balance</span>
                <div style={css.posValue}>{wethBalance ? formatEther(wethBalance as bigint) : '0'}</div>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${T.border}` }}>
              {isWrapSuccess     && <div style={alertBox('success')}>ETH wrapped to WETH successfully.</div>}
              {isApproveSuccess  && <div style={alertBox('success')}>WETH approved for the vault.</div>}
              {isDepositSuccess  && <div style={alertBox('success')}>Deposit confirmed — LP tokens issued.</div>}
              {isWithdrawSuccess && <div style={alertBox('success')}>Withdrawal confirmed.</div>}
              {depositError      && <div style={alertBox('error')}><strong>Deposit error:</strong> {depositError.message}</div>}
              {withdrawError     && <div style={alertBox('error')}><strong>Withdraw error:</strong> {withdrawError.message}</div>}
            </div>

            <div className="lp-panel-grid">
              <div style={css.panel}>
                <span style={css.panelLabel}>Step 1–3</span>
                <h3 style={css.panelTitle}>Provide liquidity</h3>
                <div style={css.noteBox}>
                  <span style={css.noteTitle}>Three-step process</span>
                  The vault accepts WETH only. Wrap your ETH first, approve the vault to spend it, then deposit to receive LP tokens representing your share.
                </div>
                <input type="number" step="0.01" placeholder="Amount in ETH" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} style={css.input} />
                <button onClick={handleWrapETH}  disabled={!depositAmount || isWrapping}                     style={actionBtn(!depositAmount || isWrapping ? 'disabled' : 'ghost')}>
                  {isWrapping  ? 'Wrapping…'  : '1 — Wrap ETH → WETH'}
                </button>
                <button onClick={handleApprove}  disabled={!depositAmount || !needsApproval || isApproving}  style={actionBtn(!depositAmount || !needsApproval || isApproving ? 'disabled' : 'ghost')}>
                  {isApproving ? 'Approving…' : needsApproval ? '2 — Approve WETH' : '2 — Already approved ✓'}
                </button>
                <button onClick={handleDeposit}  disabled={!depositAmount || needsApproval || isDepositPending} style={actionBtn(!depositAmount || needsApproval || isDepositPending ? 'disabled' : 'amber')}>
                  {isDepositPending ? 'Depositing…' : '3 — Deposit & receive LP tokens →'}
                </button>
              </div>

              <div style={{ ...css.panel, borderLeft: `1px solid ${T.border}` }}>
                <span style={css.panelLabel}>Withdraw</span>
                <h3 style={css.panelTitle}>Reclaim liquidity</h3>
                <div style={css.noteBox}>
                  <span style={css.noteTitle}>Availability</span>
                  Only unlocked funds can be withdrawn. Capital backing active options remains locked until those options settle.
                </div>
                <input type="number" step="0.01" placeholder="Amount in ETH" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} style={css.input} />
                {maxWithdraw !== undefined && (
                  <p style={css.maxNote}>Max withdrawable: {formatEther(maxWithdraw as bigint)} ETH</p>
                )}
                <button onClick={handleWithdraw} disabled={!withdrawAmount || isWithdrawPending} style={actionBtn(!withdrawAmount || isWithdrawPending ? 'disabled' : 'primary')}>
                  {isWithdrawPending ? 'Withdrawing…' : 'Withdraw →'}
                </button>
              </div>
            </div>
          </div>

          {/* ── How it works ─────────────────────────────────────────── */}
          <div style={css.wrap}>
            <div style={css.header}>
              <span style={css.label}>Protocol mechanics</span>
              <h2 style={css.headerTitle}>How liquidity provision works</h2>
            </div>
            <div className="lp-how-grid">
              {[
                { icon: '💵', title: 'Earn premiums',       desc: 'Every option buyer pays a premium into the vault. As a liquidity provider, you earn a proportional share of all premiums collected.' },
                { icon: '⚖️', title: 'Take on risk',        desc: 'If options expire in-the-money, payouts are funded from the vault. Your maximum loss is bounded by your deposited capital.' },
                { icon: '🔒', title: 'Capital efficiency',  desc: 'Only a maximum of 80% of TVL can be locked at any time. Up to 20% per location. This keeps the vault protected from correlated events.' },
                { icon: '🎫', title: 'LP tokens',           desc: 'Receive ERC-4626 vault shares representing your proportional claim. Redeem them at any time for your share of the unlocked pool.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={css.howCell}>
                  <div style={css.howIcon}>{icon}</div>
                  <div style={css.howTitle}>{title}</div>
                  <p style={css.howDesc}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'risk' && (
        <RiskDashboard
          tvl={tvl as bigint}
          utilizationBps={utilization as bigint}
        />
      )}
    </div>
  );
}