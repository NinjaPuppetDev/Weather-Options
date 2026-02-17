'use client';

import { useEffect, useState, CSSProperties } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACTS, WEATHER_OPTION_ABI, OptionType } from '../lib/contract';

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

// ─── Static styles ────────────────────────────────────────────────────────────
const css: Record<string, CSSProperties> = {
  root: { fontFamily: "'Cormorant Garamond', Georgia, serif", minHeight: '100vh' },
  topBar: { height: 3, background: `linear-gradient(90deg, ${T.amber}, ${T.greenMid})` },
  wrap: { background: T.cream, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: '1rem' },
  header: { padding: '2rem 2.5rem', borderBottom: `1px solid ${T.border}` },
  headerTitle: { fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 400, color: T.green, lineHeight: 1.1, marginBottom: '0.3rem' },
  headerSub: { fontSize: '0.82rem', color: T.textMuted, letterSpacing: '0.08em', fontFamily: "'DM Mono', monospace" },
  center: { padding: '5rem 2.5rem', textAlign: 'center', fontFamily: "'Cormorant Garamond', Georgia, serif", background: T.cream, border: `1px solid ${T.border}` },
  centerTitle: { fontSize: '1.75rem', fontWeight: 400, color: T.green, marginBottom: '0.6rem' },
  centerSub: { fontSize: '0.9rem', color: T.textMuted, lineHeight: 1.7 },
  spinnerRing: { width: 48, height: 48, border: `2px solid ${T.border}`, borderTopColor: T.amber, borderRadius: '50%', margin: '0 auto 2rem', animation: 'spin 0.9s linear infinite' },
  label: { fontSize: '0.68rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '0.5rem' },
  divider: { height: 1, background: T.border },
  monoSmall: { fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', wordBreak: 'break-all' },
  // Card
  card: { background: T.white, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.border}`, marginBottom: '0.75rem', overflow: 'hidden', transition: 'border-left-color 0.2s' },
  cardHeader: { padding: '1.5rem 2rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' },
  cardNum: { fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: '0.4rem' },
  cardTitle: { fontSize: '1.25rem', fontWeight: 500, color: T.green },
  badge: { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.75rem', fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace", border: '1px solid', marginRight: '0.5rem' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: T.border, marginTop: '1px' },
  statCell: { background: T.white, padding: '1rem 1.25rem' },
  statLabel: { fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: '0.35rem' },
  statValue: { fontSize: '1.1rem', fontWeight: 500, color: T.green, fontFamily: "'DM Mono', monospace" },
  // Expanded
  expanded: { padding: '1.75rem 2rem', borderTop: `1px solid ${T.border}`, background: T.cream },
  timelineGrid: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', padding: '1.25rem', background: T.white, border: `1px solid ${T.border}`, marginBottom: '1rem' },
  timelineLabel: { fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: '0.3rem' },
  timelineValue: { fontSize: '0.9rem', color: T.green },
  timelineArrow: { fontSize: '1.2rem', color: T.border, textAlign: 'center' },
  settlementBox: { padding: '1.25rem', background: T.successBg, border: `1px solid ${T.successBorder}`, marginBottom: '1rem' },
  debugBox: { padding: '1rem', background: T.amberLight, border: `1px solid ${T.amberBorder}`, marginTop: '1rem' },
  // Buttons
  btnRow: { display: 'flex', gap: '0.75rem', marginTop: '1.25rem' },
};

function actionBtnStyle(variant: 'primary' | 'amber' | 'disabled'): CSSProperties {
  return {
    flex: 1, padding: '0.9rem 1.25rem',
    background: variant === 'disabled' ? 'rgba(28,43,30,0.1)' : variant === 'amber' ? T.amber : T.green,
    color: variant === 'disabled' ? T.textMuted : variant === 'amber' ? T.green : '#f4ede0',
    border: 'none',
    fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase',
    fontWeight: 700, cursor: variant === 'disabled' ? 'not-allowed' : 'pointer',
    fontFamily: "'DM Mono', monospace",
    transition: 'background 0.18s',
  };
}

function badgeColor(status: number) {
  return [
    { bg: T.successBg, border: T.successBorder, text: T.successText, label: 'Active'   },
    { bg: T.warnBg,    border: T.warnBorder,    text: T.warnText,    label: 'Expired'  },
    { bg: '#eff6ff',   border: '#bfdbfe',        text: '#1e3a5f',     label: 'Settling' },
    { bg: T.amberLight,border: T.amberBorder,    text: T.amber,       label: 'Settled'  },
  ][status] ?? { bg: T.cream, border: T.border, text: T.textMuted, label: 'Unknown' };
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface Option {
  tokenId: bigint;
  terms: {
    optionType: number;
    latitude: string;
    longitude: string;
    startDate: bigint;
    expiryDate: bigint;
    strikeMM: bigint;
    spreadMM: bigint;
    notional: bigint;
    premium: bigint;
  };
  state: {
    status: number;
    buyer: string;
    createdAt: bigint;
    actualRainfall: bigint;
    finalPayout: bigint;
    ownerAtSettlement: string;
  };
}

// ─── OptionCard ───────────────────────────────────────────────────────────────
function OptionCard({
  tokenId, isExpanded, onToggle,
  onRequestSettlement, onSettle, onClaim,
  isSettling, isFinalizing, isClaiming,
}: {
  tokenId: bigint; isExpanded: boolean; onToggle: () => void;
  onRequestSettlement: (id: bigint) => void; onSettle: (id: bigint) => void; onClaim: (id: bigint) => void;
  isSettling: boolean; isFinalizing: boolean; isClaiming: boolean;
}) {
  const { data: option } = useReadContract({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'getOption', args: [tokenId] }) as { data: Option | undefined };
  const { data: pendingPayout } = useReadContract({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'pendingPayouts', args: [tokenId] }) as { data: bigint | undefined };

  if (!option) {
    return (
      <div style={{ ...css.card, padding: '1.75rem 2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', opacity: 0.4 }}>
          <div style={{ height: 14, width: 80, background: T.border, borderRadius: 2 }} />
          <div style={{ height: 14, width: 120, background: T.border, borderRadius: 2 }} />
        </div>
      </div>
    );
  }

  const { terms, state } = option;
  const isExpired = Date.now() / 1000 > Number(terms.expiryDate);
  const maxPayout = terms.notional * terms.spreadMM;
  const badge = badgeColor(state.status);
  const isCall = terms.optionType === OptionType.CALL;

  return (
    <div style={{ ...css.card, borderLeftColor: isExpanded ? T.amber : T.border }}>
      {/* Card header row */}
      <div style={css.cardHeader} onClick={onToggle}>
        <div style={{ flex: 1 }}>
          <div style={css.cardNum}>Option #{tokenId.toString()}</div>
          <div style={css.cardTitle}>{terms.latitude}°, {terms.longitude}°</div>
          <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ ...css.badge, background: badge.bg, borderColor: badge.border, color: badge.text }}>
              {badge.label}
            </span>
            <span style={{ ...css.badge, background: isCall ? '#eff6ff' : T.amberLight, borderColor: isCall ? '#bfdbfe' : T.amberBorder, color: isCall ? '#1e3a5f' : T.amber }}>
              {isCall ? 'Call' : 'Put'}
            </span>
            {isExpired && state.status === 0 && (
              <span style={{ ...css.badge, background: T.errorBg, borderColor: '#e8b4ad', color: T.errorText }}>
                Ready to settle
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={css.label}>Max payout</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 400, color: T.green }}>{formatEther(maxPayout)} ETH</div>
          <div style={{ fontSize: '0.72rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginTop: '0.25rem' }}>
            {isExpanded ? '↑ collapse' : '↓ expand'}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={css.statGrid}>
        {[
          { label: 'Strike', value: `${terms.strikeMM.toString()} mm` },
          { label: 'Spread',  value: `${terms.spreadMM.toString()} mm` },
          { label: 'Premium', value: `${formatEther(terms.premium).slice(0, 8)} ETH` },
          { label: 'Expires', value: new Date(Number(terms.expiryDate) * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) },
        ].map(({ label, value }) => (
          <div key={label} style={css.statCell}>
            <div style={css.statLabel}>{label}</div>
            <div style={css.statValue}>{value}</div>
          </div>
        ))}
      </div>

      {/* Expanded section */}
      {isExpanded && (
        <div style={css.expanded} onClick={(e) => e.stopPropagation()}>

          {/* Coverage period */}
          <span style={css.label}>Coverage period</span>
          <div style={css.timelineGrid}>
            <div>
              <div style={css.timelineLabel}>Start</div>
              <div style={css.timelineValue}>{new Date(Number(terms.startDate) * 1000).toLocaleString()}</div>
            </div>
            <div style={css.timelineArrow}>→</div>
            <div>
              <div style={css.timelineLabel}>Expiry</div>
              <div style={css.timelineValue}>{new Date(Number(terms.expiryDate) * 1000).toLocaleString()}</div>
            </div>
          </div>

          {/* Settlement result */}
          {state.actualRainfall > BigInt(0) && (
            <>
              <span style={{ ...css.label, marginTop: '1.25rem' }}>Settlement result</span>
              <div style={css.settlementBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.9rem', color: T.successText }}>Actual rainfall</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: T.green }}>{state.actualRainfall.toString()} mm</span>
                </div>
                {(state.finalPayout > BigInt(0) || (pendingPayout && pendingPayout > BigInt(0))) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.successBorder}`, paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', color: T.successText }}>Your payout</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.25rem', fontWeight: 700, color: T.successText }}>
                      {formatEther(state.finalPayout || pendingPayout || BigInt(0))} ETH
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          {isExpired && state.status === 0 && (
            <div style={css.btnRow}>
              <button onClick={(e) => { e.stopPropagation(); onRequestSettlement(tokenId); }}
                disabled={isSettling} style={actionBtnStyle(isSettling ? 'disabled' : 'amber')}>
                {isSettling ? 'Requesting…' : '1 — Request settlement'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onSettle(tokenId); }}
                disabled={isFinalizing} style={actionBtnStyle(isFinalizing ? 'disabled' : 'primary')}>
                {isFinalizing ? 'Finalizing…' : '2 — Finalize settlement'}
              </button>
            </div>
          )}

          {state.status === 3 && pendingPayout && pendingPayout > BigInt(0) && (
            <div style={{ marginTop: '1.25rem' }}>
              <button onClick={(e) => { e.stopPropagation(); onClaim(tokenId); }}
                disabled={isClaiming} style={{ ...actionBtnStyle(isClaiming ? 'disabled' : 'amber'), flex: 'none', width: '100%' }}>
                {isClaiming ? 'Claiming…' : `Claim ${formatEther(pendingPayout)} ETH →`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MyOptions() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [mounted, setMounted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userTokenIds, setUserTokenIds] = useState<bigint[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  useEffect(() => setMounted(true), []);

  const { data: balance } = useReadContract({
    address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: mounted && isConnected && !!address },
  }) as { data: bigint | undefined };

  useEffect(() => {
    if (!mounted || !isConnected || !address || !publicClient) return;
    (async () => {
      setIsScanning(true); setScanComplete(false);
      const owned: bigint[] = [];
      for (let i = 0; i < 50; i++) {
        try {
          const owner = await publicClient.readContract({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'ownerOf', args: [BigInt(i)] }) as string;
          if (owner.toLowerCase() === address.toLowerCase()) owned.push(BigInt(i));
        } catch { /* token doesn't exist */ }
      }
      setUserTokenIds(owned); setIsScanning(false); setScanComplete(true);
    })();
  }, [address, mounted, isConnected, publicClient]);

  const { writeContract: requestSettlement, data: settlementHash } = useWriteContract();
  const { isLoading: isSettling } = useWaitForTransactionReceipt({ hash: settlementHash });
  const { writeContract: settle, data: settleHash } = useWriteContract();
  const { isLoading: isFinalizing } = useWaitForTransactionReceipt({ hash: settleHash });
  const { writeContract: claimPayout, data: claimHash } = useWriteContract();
  const { isLoading: isClaiming } = useWaitForTransactionReceipt({ hash: claimHash });

  if (!mounted) return null;

  if (!isConnected) {
    return (
      <div style={css.center}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={css.topBar} />
        <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🛡</div>
        <h2 style={css.centerTitle}>My Protection</h2>
        <p style={css.centerSub}>Connect your wallet to view your weather options.</p>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div style={css.center}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={css.topBar} />
        <div style={css.spinnerRing} />
        <h2 style={css.centerTitle}>Scanning your options</h2>
        <p style={css.centerSub}>Reading on-chain token ownership…</p>
      </div>
    );
  }

  if (scanComplete && userTokenIds.length === 0) {
    return (
      <div style={{ ...css.center, textAlign: 'left', padding: '2.5rem' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={css.topBar} />
        <div style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📭</div>
          <h2 style={css.centerTitle}>No options found</h2>
          <p style={{ ...css.centerSub, maxWidth: 400, margin: '0 auto 2rem' }}>
            {balance && Number(balance) > 0
              ? `Your wallet holds ${balance.toString()} NFT(s) but none were found in the scan range 0–49.`
              : 'Create your first weather protection option to get started.'}
          </p>
        </div>

        {/* Debug panel */}
        <div style={css.debugBox}>
          <span style={css.label}>Debug information</span>
          {[
            ['Address', address ?? '—'],
            ['NFT balance', balance?.toString() ?? '0'],
            ['Contract', CONTRACTS.WEATHER_OPTION],
            ['Tokens scanned', '0–49'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: `1px solid ${T.amberBorder}`, fontSize: '0.82rem' }}>
              <span style={{ color: T.textMuted }}>{k}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", color: T.green, fontSize: '0.72rem' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {/* Page header */}
      <div style={{ ...css.wrap, marginBottom: '1.5rem' }}>
        <div style={css.topBar} />
        <div style={css.header}>
          <span style={css.label}>Portfolio</span>
          <h1 style={css.headerTitle}>My weather options</h1>
          <p style={css.headerSub}>{userTokenIds.length} option{userTokenIds.length !== 1 ? 's' : ''} found</p>
        </div>
      </div>

      {/* Cards */}
      {userTokenIds.map((tokenId) => (
        <OptionCard
          key={tokenId.toString()}
          tokenId={tokenId}
          isExpanded={expandedId === tokenId.toString()}
          onToggle={() => setExpandedId(expandedId === tokenId.toString() ? null : tokenId.toString())}
          onRequestSettlement={(id) => requestSettlement({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'requestSettlement', args: [id] })}
          onSettle={(id) => settle({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'settle', args: [id] })}
          onClaim={(id) => claimPayout({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'claimPayout', args: [id] })}
          isSettling={isSettling}
          isFinalizing={isFinalizing}
          isClaiming={isClaiming}
        />
      ))}
    </>
  );
}