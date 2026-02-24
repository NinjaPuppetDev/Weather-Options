'use client';

import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatEther, type Abi } from 'viem';
import { VAULT_ABI, WEATHER_OPTION_ABI, CONTRACTS } from '../lib/contract';

// ─── Design tokens ────────────────────────────────────────────────────────────
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

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Mono:wght@400;700&display=swap');

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes log-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }

  .wm-log-entry {
    animation: log-in 0.22s ease forwards;
    border-bottom: 1px solid ${T.border};
    padding: 0.6rem 1.5rem;
    display: grid;
    grid-template-columns: 7rem 5.5rem 1fr;
    gap: 0.75rem;
    align-items: baseline;
    font-family: 'DM Mono', monospace;
    font-size: 0.75rem;
    line-height: 1.6;
  }
  .wm-log-entry:last-child { border-bottom: none; }
  .wm-log-entry:hover { background: ${T.amberLight}; }

  .wm-skeleton {
    background: linear-gradient(90deg, ${T.border} 25%, rgba(28,43,30,0.04) 50%, ${T.border} 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 2px;
  }

  .wm-metric-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 1px; background: ${T.border};
  }
  .wm-workflow-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1px; background: ${T.border};
    border-top: 1px solid ${T.border};
  }
  .wm-ai-panel {
    padding: 2rem 2.5rem;
    border-top: 1px solid ${T.border};
    background: ${T.green};
  }

  @media (max-width: 900px) {
    .wm-metric-grid { grid-template-columns: repeat(2, 1fr); }
    .wm-log-entry   { grid-template-columns: 6rem 1fr; }
    .wm-log-entry > *:nth-child(2) { display: none; }
  }
  @media (max-width: 640px) {
    .wm-metric-grid   { grid-template-columns: 1fr 1fr; }
    .wm-workflow-grid { grid-template-columns: 1fr; }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────
type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'ai';

interface LogEntry {
  id: string;
  ts: string;
  level: LogLevel;
  workflow: 'settlement' | 'risk';
  message: string;
}

interface HydratedOption {
  tokenId: number;
  optionType: number;
  latitude: string;
  longitude: string;
  expiryDate: bigint;
  strikeMM: bigint;
  spreadMM: bigint;
  notional: bigint;
  status: number;
}

interface WorkflowState {
  settlement: {
    lastRun:   string | null;
    status:    'idle' | 'running' | 'done' | 'error';
    requested: number[];
    settled:   number[];
    bridged:   number[];
    skipped:   number[];
    errors:    number;
  };
  risk: {
    lastRun:        string | null;
    status:         'idle' | 'running' | 'done' | 'error';
    tvlEth:         string;
    utilizationPct: string;
    expectedLossPct:string;
    netPnlEth:      string;
    groqSummary:    string | null;
    groqLoading:    boolean;
    actionTaken:    boolean;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nowISO() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z';
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function weiToEth(wei: bigint): string {
  return Number(formatEther(wei)).toFixed(4);
}
function bpsToPercent(bps: bigint): string {
  return (Number(bps) / 100).toFixed(2);
}

const KNOWN_LOCATIONS: Record<string, string> = {
  '6.25,-75.56':  'Medellín',
  '51.51,-0.13':  'London',
  '25.76,-80.19': 'Miami',
  '40.71,-74.01': 'New York',
  '35.68,139.69': 'Tokyo',
  '48.86,2.35':   'Paris',
};

function resolveLocation(lat: string, lon: string) {
  const k = `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
  return KNOWN_LOCATIONS[k] ?? `${Number(lat).toFixed(2)}°, ${Number(lon).toFixed(2)}°`;
}

// ─── Log level config ─────────────────────────────────────────────────────────
const LEVEL_CFG: Record<LogLevel, { label: string; color: string }> = {
  info:    { label: 'INFO',  color: T.muted },
  success: { label: 'OK',    color: T.successText },
  warn:    { label: 'WARN',  color: T.warnText },
  error:   { label: 'ERROR', color: T.errorText },
  ai:      { label: 'AI',    color: T.amber },
};

const WORKFLOW_CFG = {
  settlement: { label: 'SETTLEMENT', color: T.greenMid },
  risk:       { label: 'RISK',       color: T.amber    },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusDot({ status }: { status: WorkflowState['settlement']['status'] }) {
  const colorMap = { idle: T.border, running: T.amber, done: T.successText, error: T.errorText };
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: colorMap[status],
      animation: status === 'running' ? 'pulse-dot 1s ease-in-out infinite' : 'none',
      marginRight: '0.4rem', verticalAlign: 'middle',
    }} />
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12,
      border: `2px solid ${T.amberBorder}`,
      borderTopColor: T.amber,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      verticalAlign: 'middle',
      marginRight: '0.4rem',
    }} />
  );
}

function MetricCell({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div style={{ padding: '1.4rem 1.75rem', background: T.white }}>
      <span style={{
        display: 'block', fontSize: '0.62rem', letterSpacing: '0.22em',
        textTransform: 'uppercase', color: T.amber,
        fontFamily: "'DM Mono', monospace", marginBottom: '0.4rem',
      }}>
        {label}
      </span>
      <div style={{
        fontSize: 'clamp(1.1rem, 2vw, 1.6rem)', fontWeight: 400,
        color: highlight ? T.amber : T.green,
        fontFamily: "'Cormorant Garamond', Georgia, serif",
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.68rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginTop: '0.2rem' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function WorkflowStatusCard({
  title, tag, tagColor, status, lastRun, children,
}: {
  title: string; tag: string; tagColor: string;
  status: WorkflowState['settlement']['status'];
  lastRun: string | null;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: '1.75rem 2rem', background: T.cream }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <span style={{
            fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: tagColor, fontFamily: "'DM Mono', monospace", fontWeight: 700,
            border: `1px solid ${tagColor}`, padding: '0.1rem 0.4rem', opacity: 0.8,
          }}>
            {tag}
          </span>
          <h3 style={{
            fontSize: '1.1rem', fontWeight: 500, color: T.green,
            marginTop: '0.5rem', marginBottom: 0,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}>
            {title}
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: T.textMuted, marginBottom: '0.2rem' }}>
            <StatusDot status={status} />
            {status.toUpperCase()}
          </div>
          <div style={{ fontSize: '0.62rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>
            {lastRun ? `Last run ${lastRun.substring(11, 19)}` : 'Not yet run'}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
      padding: '0.5rem 0.75rem', border: `1px solid ${T.border}`,
      background: T.white, minWidth: '3.5rem', marginRight: '0.5rem', marginBottom: '0.5rem',
    }}>
      <span style={{ fontSize: '1.2rem', fontWeight: 400, color, fontFamily: "'Cormorant Garamond', serif" }}>
        {value}
      </span>
      <span style={{ fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>
        {label}
      </span>
    </div>
  );
}

function LogViewer({ entries, maxHeight = 320 }: { entries: LogEntry[]; maxHeight?: number }) {
  return (
    <div style={{ maxHeight, overflowY: 'auto', background: T.white, borderTop: `1px solid ${T.border}` }}>
      {entries.length === 0 ? (
        <div style={{
          padding: '2.5rem', textAlign: 'center',
          color: T.textMuted, fontSize: '0.8rem', fontFamily: "'DM Mono', monospace",
        }}>
          Waiting for workflow execution…
        </div>
      ) : (
        [...entries].reverse().map((e) => (
          <div key={e.id} className="wm-log-entry">
            <span style={{ color: T.textMuted, fontSize: '0.68rem' }}>{e.ts.substring(11, 19)}</span>
            <span style={{ color: WORKFLOW_CFG[e.workflow].color, fontSize: '0.62rem', letterSpacing: '0.12em' }}>
              {WORKFLOW_CFG[e.workflow].label}
            </span>
            <span style={{ color: LEVEL_CFG[e.level].color, wordBreak: 'break-word' }}>
              {e.level !== 'info' && (
                <span style={{ fontSize: '0.58rem', letterSpacing: '0.15em', marginRight: '0.4rem', fontWeight: 700, opacity: 0.7 }}>
                  [{LEVEL_CFG[e.level].label}]
                </span>
              )}
              {e.message}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

// ─── useHydratedOptions ───────────────────────────────────────────────────────
// Fetches the full option struct for every active tokenId in one multicall.
function useHydratedOptions(activeIds: bigint[] | undefined): {
  options: HydratedOption[] | undefined;
  isLoading: boolean;
} {
  const contracts = (activeIds ?? []).map((id) => ({
    address: CONTRACTS.WEATHER_OPTION as `0x${string}`,
    abi: WEATHER_OPTION_ABI as Abi,
    functionName: 'getOption',
    args: [id],
  }));

  const { data, isLoading } = useReadContracts({
    contracts,
    query: { enabled: !!activeIds && activeIds.length > 0 },
  });

  if (!data || !activeIds) return { options: undefined, isLoading };

  const options: HydratedOption[] = [];

  for (let i = 0; i < data.length; i++) {
    const result = data[i];
    if (result.status !== 'success' || !result.result) continue;

    const raw = result.result as any;

    // Support both flat and nested (terms/state) struct layouts.
    // Adjust field paths here if your ABI uses different names.
    const terms  = raw.terms  ?? raw;
    const state  = raw.state  ?? raw;

    options.push({
      tokenId:    Number(activeIds[i]),
      optionType: Number(terms.optionType  ?? raw.optionType  ?? 0),
      latitude:   String(terms.latitude    ?? raw.latitude    ?? '0'),
      longitude:  String(terms.longitude   ?? raw.longitude   ?? '0'),
      expiryDate: BigInt(terms.expiryDate  ?? raw.expiryDate  ?? 0),
      strikeMM:   BigInt(terms.strikeMM    ?? raw.strikeMM    ?? 0),
      spreadMM:   BigInt(terms.spreadMM    ?? raw.spreadMM    ?? 0),
      notional:   BigInt(terms.notional    ?? raw.notional    ?? 0),
      status:     Number(state.status      ?? raw.status      ?? 0),
    });
  }

  return { options, isLoading };
}

// ─── Simulation engine ────────────────────────────────────────────────────────
function useWorkflowSimulator(
  metrics: [bigint, bigint, bigint, bigint, bigint, bigint, bigint] | undefined,
  activeIds: bigint[] | undefined,
  options: HydratedOption[] | undefined,
  utilizationAlertBps: number,
) {
  const [logs, setLogs]   = useState<LogEntry[]>([]);
  const [state, setState] = useState<WorkflowState>({
    settlement: { lastRun: null, status: 'idle', requested: [], settled: [], bridged: [], skipped: [], errors: 0 },
    risk:       { lastRun: null, status: 'idle', tvlEth: '—', utilizationPct: '—', expectedLossPct: '—', netPnlEth: '—', groqSummary: null, groqLoading: false, actionTaken: false },
  });

  const addLog = useCallback((workflow: LogEntry['workflow'], level: LogLevel, message: string) => {
    setLogs((prev) => [...prev, { id: uid(), ts: nowISO(), level, workflow, message }]);
  }, []);

  // ── Settlement workflow ───────────────────────────────────────────────────
  const runSettlement = useCallback(async () => {
    if (!activeIds || !options) return;

    setLogs([]);
    setState((s) => ({
      ...s,
      settlement: { ...s.settlement, status: 'running', lastRun: nowISO(), requested: [], settled: [], bridged: [], skipped: [], errors: 0 },
    }));

    addLog('settlement', 'info', '=== Bruma Settlement Workflow triggered ===');
    await new Promise((r) => setTimeout(r, 300));
    addLog('settlement', 'info', `Active options: ${activeIds.length}`);

    const result = { requested: [] as number[], settled: [] as number[], bridged: [] as number[], skipped: [] as number[], errors: 0 };
    const now = Math.floor(Date.now() / 1000);

    for (const opt of options) {
      await new Promise((r) => setTimeout(r, 200));

      const expired = Number(opt.expiryDate) <= now;

      if (opt.status === 0) { // Active
        if (!expired) {
          const rem = Number(opt.expiryDate) - now;
          const d   = Math.floor(rem / 86400);
          const h   = Math.floor((rem % 86400) / 3600);
          addLog('settlement', 'info', `TokenId ${opt.tokenId}: not yet expired (${d}d ${h}h remaining), skipping.`);
          result.skipped.push(opt.tokenId);
        } else {
          addLog('settlement', 'warn', `TokenId ${opt.tokenId}: expired — requesting settlement…`);
          result.requested.push(opt.tokenId);
        }
      } else if (opt.status === 2) { // Settling — oracle pending
        addLog('settlement', 'info', `TokenId ${opt.tokenId}: oracle pending, will retry next run.`);
        result.skipped.push(opt.tokenId);
      } else if (opt.status === 3) { // Already settled
        addLog('settlement', 'info', `TokenId ${opt.tokenId}: already settled, skipping.`);
        result.skipped.push(opt.tokenId);
      } else {
        addLog('settlement', 'info', `TokenId ${opt.tokenId}: status=${opt.status}, skipping.`);
        result.skipped.push(opt.tokenId);
      }
    }

    await new Promise((r) => setTimeout(r, 300));
    addLog(
      'settlement',
      result.errors > 0 ? 'error' : 'success',
      `Settlement requested: [${result.requested.join(', ') || '—'}] · Settled: [${result.settled.join(', ') || '—'}] · Bridged: [${result.bridged.join(', ') || '—'}] · Skipped: [${result.skipped.join(', ') || '—'}] · Errors: ${result.errors}`,
    );

    setState((s) => ({ ...s, settlement: { ...s.settlement, status: 'done', lastRun: nowISO(), ...result } }));
  }, [activeIds, options, addLog]);

  // ── Risk guardian ─────────────────────────────────────────────────────────
  const runRisk = useCallback(async () => {
    if (!metrics || !options) return;

    setLogs([]);

    const [tvl, , , utilization, , , netPnL] = metrics;
    const tvlEth  = weiToEth(tvl);
    const utilPct = bpsToPercent(utilization);
    const pnlEth  = weiToEth(netPnL < BigInt(0) ? -netPnL : netPnL);
    const pnlSign = netPnL >= BigInt(0) ? '+' : '-';

    setState((s) => ({
      ...s,
      risk: { ...s.risk, status: 'running', lastRun: nowISO(), tvlEth, utilizationPct: utilPct, netPnlEth: `${pnlSign}${pnlEth}`, groqSummary: null, groqLoading: false },
    }));

    addLog('risk', 'info', '=== Bruma Vault Risk Guardian triggered ===');
    await new Promise((r) => setTimeout(r, 250));
    addLog('risk', 'info', `Vault: TVL=${weiToEth(tvl)} ETH | Utilization=${utilPct}% | NetPnL=${pnlSign}${pnlEth} ETH`);

    if (options.length === 0) {
      addLog('risk', 'info', 'No active options — vault risk is zero.');
      setState((s) => ({ ...s, risk: { ...s.risk, status: 'done', expectedLossPct: '0.00', actionTaken: false } }));
      return;
    }

    // ── Fetch forecasts (Open-Meteo, mirrors CRE workflow) ──────────────────
    // CRE caps HTTP calls at 5 per workflow run — we replicate that limit here
    // so the simulation matches what the CLI actually does.
    const HTTP_CALL_LIMIT = 5;
    const forecasts = new Map<string, number>();
    const locationsSeen = new Set<string>();
    let httpCallCount = 0;

    for (const opt of options) {
      await new Promise((r) => setTimeout(r, 220));

      const lat = opt.latitude;
      const lon = opt.longitude;
      const key = `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
      locationsSeen.add(key);

      if (forecasts.has(key)) {
        // Cached — same location already fetched
        addLog('risk', 'info',
          `TokenId ${opt.tokenId} [${resolveLocation(lat, lon)}]: forecast = ${forecasts.get(key)!.toFixed(1)}mm over 7 days (cached)`
        );
        continue;
      }

      if (httpCallCount >= HTTP_CALL_LIMIT) {
        // Mirrors the CRE simulator's per-workflow HTTP cap
        const conservative = Number(opt.strikeMM) + Number(opt.spreadMM);
        forecasts.set(key, conservative);
        addLog('risk', 'warn',
          `TokenId ${opt.tokenId}: HTTP call limit reached (${HTTP_CALL_LIMIT}) — using conservative ${conservative}mm`
        );
        continue;
      }

      try {
        httpCallCount++;
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${lat}&longitude=${lon}` +
          `&daily=precipitation_sum&forecast_days=7&timezone=UTC`;

        const res  = await fetch(url);
        const data = await res.json();

        const total = ((data?.daily?.precipitation_sum ?? []) as (number | null)[])
          .filter((v): v is number => typeof v === 'number' && isFinite(v))
          .reduce((s, v) => s + v, 0);

        forecasts.set(key, total);
        addLog('risk', 'info',
          `TokenId ${opt.tokenId} [${resolveLocation(lat, lon)}]: forecast = ${total.toFixed(1)}mm over 7 days`
        );
      } catch {
        const conservative = Number(opt.strikeMM) + Number(opt.spreadMM);
        forecasts.set(key, conservative);
        addLog('risk', 'warn',
          `TokenId ${opt.tokenId}: forecast fetch failed — using conservative ${conservative}mm`
        );
      }
    }

    // ── Simulate payouts (mirrors CRE simulatePayout logic) ─────────────────
    let totalExpectedLoss = BigInt(0);

    for (const opt of options) {
      const key      = `${Number(opt.latitude).toFixed(2)},${Number(opt.longitude).toFixed(2)}`;
      const forecast = BigInt(Math.round(forecasts.get(key) ?? 0));
      const isCall   = opt.optionType === 0;
      let payout = BigInt(0);

      if (isCall && forecast > opt.strikeMM) {
        const diff = forecast - opt.strikeMM;
        payout = (diff < opt.spreadMM ? diff : opt.spreadMM) * opt.notional;
      } else if (!isCall && forecast < opt.strikeMM) {
        const diff = opt.strikeMM - forecast;
        payout = (diff < opt.spreadMM ? diff : opt.spreadMM) * opt.notional;
      }

      totalExpectedLoss += payout;
    }

    await new Promise((r) => setTimeout(r, 200));
    addLog('risk', 'info',
      `Expected loss across ${options.length} options: ${weiToEth(totalExpectedLoss)} ETH`
    );

    const expectedLossBps = Number(tvl) > 0
      ? Number((totalExpectedLoss * BigInt(10000)) / tvl)
      : 0;
    const expectedLossPct = (expectedLossBps / 100).toFixed(2);

    addLog('risk', 'info',
      `Expected loss as % of TVL: ${expectedLossPct}% | Alert threshold: ${utilizationAlertBps / 100}%`
    );

    setState((s) => ({ ...s, risk: { ...s.risk, expectedLossPct, groqLoading: true } }));

    // ── Groq risk summary ────────────────────────────────────────────────────
    addLog('risk', 'ai', 'Requesting AI risk summary via Groq compound…');

    let groqSummary: string | null = null;
    try {
      const resp = await fetch('/api/risk-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tvlEth,
          utilizationPct: utilPct,
          expectedLossPct,
          activeOptionsCount: options.length,
          uniqueLocations: locationsSeen.size,
          netPnlEth: `${pnlSign}${pnlEth}`,
          alertThresholdPct: (utilizationAlertBps / 100).toFixed(0),
        }),
      });
      if (resp.ok) {
        const { summary } = await resp.json();
        groqSummary = summary;
        addLog('risk', 'ai', `Groq: ${summary}`);
      } else {
        throw new Error(`Status ${resp.status}`);
      }
    } catch (e: any) {
      addLog('risk', 'warn', `AI summary unavailable (${e.message}) — workflow continues without it`);
    }

    // ── Tighten vault if threshold breached ──────────────────────────────────
    const actionTaken =
      Number(utilization) >= utilizationAlertBps ||
      expectedLossBps    >= utilizationAlertBps;

    if (actionTaken) {
      const newMax    = utilizationAlertBps + 2000;
      const newTarget = Math.round(newMax * 0.75);
      addLog('risk', 'warn',
        `⚠ Risk threshold breached — tightening vault to ${newMax / 100}% max, ${newTarget / 100}% target`
      );
    } else {
      addLog('risk', 'success',
        `Vault healthy. Utilization ${utilPct}%, expected loss ${expectedLossPct}% of TVL. No action needed.`
      );
    }

    setState((s) => ({
      ...s,
      risk: { ...s.risk, status: 'done', expectedLossPct, groqSummary, groqLoading: false, actionTaken, lastRun: nowISO() },
    }));
  }, [metrics, options, utilizationAlertBps, addLog]);

  return { logs, state, runSettlement, runRisk };
}

// ─── WorkflowMonitor ─────────────────────────────────────────────────────────
export default function WorkflowMonitor() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const UTILIZATION_ALERT_BPS = 7000;

  // ── Live on-chain reads ───────────────────────────────────────────────────
  const { data: metricsRaw } = useReadContract({
    address: CONTRACTS.VAULT,
    abi: VAULT_ABI,
    functionName: 'getMetrics',
    query: { enabled: mounted, refetchInterval: 30_000 },
  });

  const { data: activeIdsRaw } = useReadContract({
    address: CONTRACTS.WEATHER_OPTION,
    abi: WEATHER_OPTION_ABI,
    functionName: 'getActiveOptions',
    query: { enabled: mounted, refetchInterval: 30_000 },
  });

  const metrics   = metricsRaw  as [bigint,bigint,bigint,bigint,bigint,bigint,bigint] | undefined;
  const activeIds = activeIdsRaw as bigint[] | undefined;

  // ── Hydrate full option structs via multicall ─────────────────────────────
  const { options, isLoading: optionsLoading } = useHydratedOptions(activeIds);

  const { logs, state, runSettlement, runRisk } = useWorkflowSimulator(
    metrics,
    activeIds,
    options,        // ← now fully hydrated from on-chain data
    UTILIZATION_ALERT_BPS,
  );

  if (!mounted) return null;

  const [tvl, , , utilization, , , netPnL] = metrics ?? (Array(7).fill(BigInt(0)) as bigint[]);
  const isRiskHealthy = !state.risk.actionTaken && state.risk.status === 'done';
  const isRiskWarning =  state.risk.actionTaken && state.risk.status === 'done';

  const dataReady = !!metrics && !!activeIds && (activeIds.length === 0 || !!options);

  const runBtnStyle = (loading: boolean): CSSProperties => ({
    padding: '0.7rem 1.5rem', border: 'none',
    background: loading || !dataReady ? 'rgba(28,43,30,0.08)' : T.green,
    color: loading || !dataReady ? T.textMuted : T.cream,
    fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase',
    fontFamily: "'DM Mono', monospace", fontWeight: 700,
    cursor: loading || !dataReady ? 'not-allowed' : 'pointer',
    transition: 'background 0.18s',
  });

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
      <style>{STYLES}</style>

      {/* ── Live vault snapshot ──────────────────────────────────────────── */}
      <div style={{ background: T.cream, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: '1.25rem' }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${T.amber}, ${T.greenMid})` }} />
        <div style={{ padding: '1.75rem 2.5rem', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '0.35rem' }}>
            Chainlink CRE — Live on-chain snapshot
          </span>
          <h2 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 400, color: T.green, margin: 0 }}>
            Workflow Monitor
          </h2>
          <p style={{ fontSize: '0.78rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginTop: '0.3rem', marginBottom: 0 }}>
            Replays CRE workflow logic against live Sepolia contracts · Groq risk summary via Confidential HTTP
          </p>
        </div>

        <div className="wm-metric-grid">
          <MetricCell
            label="TVL"
            value={metrics ? `${weiToEth(tvl)} ETH` : '—'}
            sub="vault total value locked"
          />
          <MetricCell
            label="Utilization"
            value={metrics ? `${bpsToPercent(utilization)}%` : '—'}
            sub="80% maximum"
            highlight={metrics ? Number(utilization) > 7000 : false}
          />
          <MetricCell
            label="Active options"
            value={activeIds ? String(activeIds.length) : '—'}
            sub={optionsLoading ? 'loading details…' : 'on-chain positions'}
          />
          <MetricCell
            label="Net P&L"
            value={metrics ? `${netPnL >= BigInt(0) ? '+' : '−'}${weiToEth(netPnL < BigInt(0) ? -netPnL : netPnL)} ETH` : '—'}
            sub="premiums − payouts"
          />
        </div>
      </div>

      {/* ── Workflow cards ───────────────────────────────────────────────── */}
      <div style={{ background: T.cream, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: '1.25rem' }}>
        <div style={{ padding: '1.5rem 2.5rem', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '0.3rem' }}>
              Two-workflow orchestration
            </span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 400, color: T.green, margin: 0 }}>
              Run simulations
            </h3>
            {!dataReady && (
              <p style={{ fontSize: '0.65rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", margin: '0.3rem 0 0' }}>
                {optionsLoading ? 'Loading on-chain option data…' : 'Waiting for on-chain data…'}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              style={runBtnStyle(state.settlement.status === 'running')}
              onClick={runSettlement}
              disabled={state.settlement.status === 'running' || !dataReady}
            >
              {state.settlement.status === 'running' ? <><Spinner />Running…</> : '▶ Settlement workflow'}
            </button>
            <button
              style={runBtnStyle(state.risk.status === 'running')}
              onClick={runRisk}
              disabled={state.risk.status === 'running' || !dataReady}
            >
              {state.risk.status === 'running' ? <><Spinner />Running…</> : '▶ Risk guardian'}
            </button>
          </div>
        </div>

        <div className="wm-workflow-grid">
          {/* Settlement */}
          <WorkflowStatusCard
            title="Settlement Automation"
            tag="CRON · 5 MIN"
            tagColor={T.greenMid}
            status={state.settlement.status}
            lastRun={state.settlement.lastRun}
          >
            <p style={{ fontSize: '0.82rem', color: T.muted, lineHeight: 1.7, marginBottom: '1rem' }}>
              Scans all active options. Drives expired ones through{' '}
              <code style={{ fontSize: '0.75rem', color: T.greenMid }}>requestSettlement()</code> →{' '}
              <code style={{ fontSize: '0.75rem', color: T.greenMid }}>settle()</code> and routes
              cross-chain payouts via CCIP.
            </p>
            {state.settlement.status !== 'idle' && (
              <div style={{ flexWrap: 'wrap', display: 'flex' }}>
                <StatBadge label="Requested" value={state.settlement.requested.length} color={T.warnText}    />
                <StatBadge label="Settled"   value={state.settlement.settled.length}   color={T.successText} />
                <StatBadge label="Bridged"   value={state.settlement.bridged.length}   color={T.amber}       />
                <StatBadge label="Skipped"   value={state.settlement.skipped.length}   color={T.muted}       />
                <StatBadge label="Errors"    value={state.settlement.errors}           color={T.errorText}   />
              </div>
            )}
          </WorkflowStatusCard>

          {/* Risk guardian */}
          <WorkflowStatusCard
            title="Vault Risk Guardian"
            tag="CRON · 1 HR"
            tagColor={T.amber}
            status={state.risk.status}
            lastRun={state.risk.lastRun}
          >
            <p style={{ fontSize: '0.82rem', color: T.muted, lineHeight: 1.7, marginBottom: '1rem' }}>
              Fetches 7-day weather forecasts for every active option location, simulates payouts,
              and tightens vault limits proactively if risk threshold is breached.
            </p>
            {state.risk.status !== 'idle' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { label: 'TVL',           value: `${state.risk.tvlEth} ETH` },
                  { label: 'Utilization',   value: `${state.risk.utilizationPct}%` },
                  { label: 'Expected loss', value: `${state.risk.expectedLossPct}%` },
                  { label: 'Net P&L',       value: state.risk.netPnlEth },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '0.5rem 0.75rem', background: T.white, border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>{label}</div>
                    <div style={{ fontSize: '0.95rem', color: T.green, fontFamily: "'DM Mono', monospace", marginTop: '0.15rem' }}>{value}</div>
                  </div>
                ))}
              </div>
            )}
            {isRiskHealthy && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: T.successBg, border: `1px solid ${T.successBorder}`, fontSize: '0.75rem', color: T.successText, fontFamily: "'DM Mono', monospace" }}>
                ✓ Vault healthy — no action taken
              </div>
            )}
            {isRiskWarning && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: T.warnBg, border: `1px solid ${T.warnBorder}`, fontSize: '0.75rem', color: T.warnText, fontFamily: "'DM Mono', monospace" }}>
                ⚠ Risk threshold breached — vault limits tightened
              </div>
            )}
          </WorkflowStatusCard>
        </div>

        {/* AI summary panel */}
        {(state.risk.groqSummary || state.risk.groqLoading) && (
          <div className="wm-ai-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{
                fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                color: T.amber, fontFamily: "'DM Mono', monospace", fontWeight: 700,
                border: `1px solid ${T.amber}`, padding: '0.1rem 0.4rem', opacity: 0.9,
              }}>
                Groq compound · Confidential HTTP
              </span>
              <span style={{ fontSize: '0.65rem', color: 'rgba(244,237,224,0.4)', fontFamily: "'DM Mono', monospace" }}>
                API key sealed in Vault DON enclave · never exposed to nodes
              </span>
            </div>
            {state.risk.groqLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Spinner />
                <span style={{ fontSize: '0.82rem', color: 'rgba(244,237,224,0.5)', fontFamily: "'DM Mono', monospace" }}>
                  Generating risk summary…
                </span>
              </div>
            ) : (
              <p style={{
                fontSize: 'clamp(0.95rem, 1.5vw, 1.15rem)', color: T.cream,
                lineHeight: 1.8, margin: 0,
                fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400,
              }}>
                "{state.risk.groqSummary}"
              </p>
            )}
          </div>
        )}

        {/* Log viewer */}
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          <div style={{
            padding: '0.75rem 1.5rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: T.cream, borderBottom: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>
              Execution log
            </span>
            <span style={{ fontSize: '0.65rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>
              {logs.length} entries
            </span>
          </div>
          <LogViewer entries={logs} maxHeight={340} />
        </div>
      </div>

      {/* ── Confidential HTTP explainer ──────────────────────────────────── */}
      <div style={{ background: T.cream, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '1.75rem 2.5rem', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '0.35rem' }}>
            Architecture
          </span>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 400, color: T.green, margin: 0 }}>
            How Confidential HTTP works
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: T.border }}>
          {[
            {
              icon: '🔐',
              title: 'Secret sealed in Vault DON',
              desc: "The Groq API key lives in Chainlink's Vault DON — a decentralized secret store. It is never written into the workflow code, never logged, and never touches node memory.",
            },
            {
              icon: '🏗',
              title: 'Request executes in enclave',
              desc: 'The HTTP call is routed into a Trusted Execution Environment (TEE). The enclave fetches the key from the Vault DON, injects it via {{.groqApiKey}} template syntax, and fires the request — all inside the sealed environment.',
            },
            {
              icon: '📊',
              title: 'Response returned to workflow',
              desc: 'The Groq compound model returns a natural-language risk summary. The enclave passes it back to the workflow. Optionally the response can be AES-GCM encrypted before leaving the enclave.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ padding: '1.75rem 2rem', background: T.white }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{icon}</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: T.green, marginBottom: '0.5rem' }}>{title}</div>
              <p style={{ fontSize: '0.85rem', color: T.muted, lineHeight: 1.75, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}