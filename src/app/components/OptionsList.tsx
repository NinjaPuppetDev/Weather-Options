'use client';

import { useEffect, useState, CSSProperties } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESS, WEATHER_OPTION_ABI } from '../lib/wagmi';
import {
  formatEther,
  formatDate,
  getOptionTypeLabel,
  getOptionStatusLabel,
  getStatusColor,
  shortenAddress,
  type Option,
} from '../lib/utils';

// ─── Design tokens ───────────────────────────────────────────────────────────
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
  blueBg:       '#eff6ff',
  blueBorder:   '#bfdbfe',
  blueText:     '#1e3a8a',
};

// ─── Status badge colors ──────────────────────────────────────────────────────
function statusBadgeStyle(status: number): CSSProperties {
  const map: Record<number, { bg: string; color: string; border: string }> = {
    0: { bg: T.amberLight,  color: T.amber,       border: T.amberBorder },
    1: { bg: T.blueBg,      color: T.blueText,    border: T.blueBorder },
    2: { bg: T.successBg,   color: T.successText, border: T.successBorder },
    3: { bg: T.errorBg,     color: T.errorText,   border: T.errorBorder },
  };
  const s = map[status] ?? map[0];
  return {
    display: 'inline-block',
    padding: '0.25rem 0.6rem',
    background: s.bg,
    border: `1px solid ${s.border}`,
    color: s.color,
    fontSize: '0.65rem',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
    marginRight: '0.4rem',
  };
}

function typeBadgeStyle(): CSSProperties {
  return {
    display: 'inline-block',
    padding: '0.25rem 0.6rem',
    background: T.amberLight,
    border: `1px solid ${T.amberBorder}`,
    color: T.amber,
    fontSize: '0.65rem',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
  };
}

function actionBtn(variant: 'primary' | 'amber' | 'ghost' | 'disabled'): CSSProperties {
  const map = {
    primary:  { bg: T.green,                    color: '#f4ede0', cursor: 'pointer' },
    amber:    { bg: T.amber,                    color: T.green,   cursor: 'pointer' },
    ghost:    { bg: 'transparent',              color: T.muted,   cursor: 'pointer' },
    disabled: { bg: 'rgba(28,43,30,0.1)',       color: T.textMuted, cursor: 'not-allowed' },
  };
  const v = map[variant];
  return {
    flex: 1,
    padding: '0.75rem 1rem',
    background: v.bg,
    color: v.color,
    border: variant === 'ghost' ? `1px solid ${T.border}` : 'none',
    fontSize: '0.68rem',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontWeight: 700,
    cursor: v.cursor,
    fontFamily: "'DM Mono', monospace",
    transition: 'background 0.18s',
  };
}

// ─── Static styles ────────────────────────────────────────────────────────────
const css: Record<string, CSSProperties> = {
  root:         { fontFamily: "'Cormorant Garamond', Georgia, serif" },
  topBar:       { height: 3, background: `linear-gradient(90deg, ${T.amber}, ${T.greenMid})` },
  wrap:         { background: T.cream, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: '1.25rem' },
  header:       { padding: '2rem 2.5rem', borderBottom: `1px solid ${T.border}` },
  headerTitle:  { fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 400, color: T.green, lineHeight: 1.1, marginBottom: '0.3rem' },
  label:        { fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", marginBottom: '0.5rem', display: 'block' },
  headerSub:    { fontSize: '0.82rem', color: T.textMuted, letterSpacing: '0.08em', fontFamily: "'DM Mono', monospace" },
  empty:        { padding: '4rem 2.5rem', textAlign: 'center', color: T.textMuted, fontFamily: "'DM Mono', monospace", fontSize: '0.85rem', letterSpacing: '0.1em' },
  // Card
  card:         { borderBottom: `1px solid ${T.border}`, background: T.white },
  cardHeader:   { padding: '1.5rem 2rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle:    { fontSize: '1.2rem', fontWeight: 400, color: T.green, marginBottom: '0.5rem' },
  cardMeta:     { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' as const, marginBottom: '0.75rem' },
  cardGrid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: T.border },
  cardCell:     { background: T.cream, padding: '0.75rem 1.25rem' },
  cellLabel:    { fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '0.25rem' },
  cellValue:    { fontSize: '0.95rem', color: T.green, fontFamily: "'DM Mono', monospace" },
  // Expanded detail grid
  detailGrid:   { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: T.border, borderTop: `1px solid ${T.border}` },
  detailCell:   { background: T.white, padding: '1rem 1.5rem' },
  // Rainfall callout
  rainfallBox:  { padding: '1.25rem 2rem', background: T.blueBg, borderTop: `1px solid ${T.blueBorder}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px' },
  rainfallLabel:{ fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: T.blueText, fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '0.25rem' },
  rainfallValue:{ fontSize: '1.2rem', fontWeight: 400, color: T.blueText },
  // Actions
  actionRow:    { display: 'flex', gap: '1px', borderTop: `1px solid ${T.border}`, background: T.border },
  chevron:      { fontSize: '0.75rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", transition: 'transform 0.2s' },
  notional:     { textAlign: 'right' as const },
  notionalLabel:{ fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '0.2rem' },
  notionalValue:{ fontSize: '1.3rem', fontWeight: 400, color: T.green },
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function OptionsList() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { data: activeOptionIds, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: WEATHER_OPTION_ABI,
    functionName: 'getActiveOptions',
    query: { enabled: mounted && isConnected },
  }) as { data: bigint[] | undefined; refetch: () => void };

  const { writeContract: requestSettlement, data: settlementHash } = useWriteContract();
  const { isLoading: isSettlementPending, isSuccess: isSettlementSuccess } = useWaitForTransactionReceipt({ hash: settlementHash });

  const { writeContract: settle, data: settleHash } = useWriteContract();
  const { isLoading: isSettlePending, isSuccess: isSettleSuccess } = useWaitForTransactionReceipt({ hash: settleHash });

  useEffect(() => {
    if (isSettlementSuccess || isSettleSuccess) {
      setTimeout(() => refetch(), 2000);
    }
  }, [isSettlementSuccess, isSettleSuccess, refetch]);

  const handleRequestSettlement = (tokenId: bigint) => {
    requestSettlement({ address: CONTRACT_ADDRESS, abi: WEATHER_OPTION_ABI, functionName: 'requestSettlement', args: [tokenId] });
  };

  const handleSettle = (tokenId: bigint) => {
    settle({ address: CONTRACT_ADDRESS, abi: WEATHER_OPTION_ABI, functionName: 'settle', args: [tokenId] });
  };

  if (!mounted) return null;

  return (
    <div style={css.root}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Mono:wght@400;700&display=swap');`}</style>

      <div style={css.wrap}>
        <div style={css.topBar} />
        <div style={css.header}>
          <span style={css.label}>Options market</span>
          <h2 style={css.headerTitle}>Active options</h2>
          <p style={css.headerSub}>
            {!isConnected
              ? 'Connect your wallet to view options'
              : !activeOptionIds
              ? 'Loading positions…'
              : `${activeOptionIds.length} position${activeOptionIds.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {(!isConnected || !activeOptionIds || activeOptionIds.length === 0) ? (
          <div style={css.empty}>
            {!isConnected
              ? '⟡  Connect your wallet to view options'
              : '⟡  No active options found'}
          </div>
        ) : (
          <div>
            {activeOptionIds.map((tokenId) => (
              <OptionCard
                key={tokenId.toString()}
                tokenId={tokenId}
                onRequestSettlement={handleRequestSettlement}
                onSettle={handleSettle}
                isSettlementPending={isSettlementPending}
                isSettlePending={isSettlePending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Option card ──────────────────────────────────────────────────────────────
function OptionCard({
  tokenId,
  onRequestSettlement,
  onSettle,
  isSettlementPending,
  isSettlePending,
}: {
  tokenId: bigint;
  onRequestSettlement: (tokenId: bigint) => void;
  onSettle: (tokenId: bigint) => void;
  isSettlementPending: boolean;
  isSettlePending: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: option } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: WEATHER_OPTION_ABI,
    functionName: 'getOption',
    args: [tokenId],
  }) as { data: Option | undefined };

  if (!option) return null;

  const { terms, state } = option;
  const isExpired = Date.now() / 1000 > Number(terms.expiryDate);
  const canAct    = isExpired && state.status === 0;

  const detailFields = [
    { label: 'Location',   value: `${terms.latitude}, ${terms.longitude}` },
    { label: 'Spread',     value: `${terms.spreadMM.toString()} mm` },
    { label: 'Start date', value: formatDate(terms.startDate) },
    { label: 'Expiry',     value: formatDate(terms.expiryDate) },
    { label: 'Buyer',      value: shortenAddress(state.buyer) },
    { label: 'Seller',     value: shortenAddress(terms.seller) },
  ];

  return (
    <div style={css.card}>
      {/* ── Summary row (always visible) ── */}
      <div style={css.cardHeader} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={{ flex: 1 }}>
          <div style={css.cardTitle}>Option #{tokenId.toString()}</div>
          <div style={css.cardMeta}>
            <span style={statusBadgeStyle(state.status)}>{getOptionStatusLabel(state.status)}</span>
            <span style={typeBadgeStyle()}>{getOptionTypeLabel(terms.optionType)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 2rem', maxWidth: 320 }}>
            <div>
              <span style={css.cellLabel}>Strike</span>
              <span style={css.cellValue}>{terms.strikeMM.toString()} mm</span>
            </div>
            <div>
              <span style={css.cellLabel}>Premium</span>
              <span style={css.cellValue}>{formatEther(terms.premium)} ETH</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={css.notional}>
            <span style={css.notionalLabel}>Notional</span>
            <div style={css.notionalValue}>{formatEther(terms.notional)} ETH</div>
          </div>
          <span style={{ ...css.chevron, transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
      </div>

      {/* ── Expanded details ── */}
      {isExpanded && (
        <>
          <div style={css.detailGrid}>
            {detailFields.map(({ label, value }) => (
              <div key={label} style={css.detailCell}>
                <span style={css.cellLabel}>{label}</span>
                <span style={{ ...css.cellValue, fontFamily: label === 'Buyer' || label === 'Seller' ? "'DM Mono', monospace" : 'inherit' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Rainfall + payout callout */}
          {state.actualRainfall > BigInt(0) && (
            <div style={css.rainfallBox}>
              <div>
                <span style={css.rainfallLabel}>Actual rainfall</span>
                <div style={css.rainfallValue}>{state.actualRainfall.toString()} mm</div>
              </div>
              {state.finalPayout > BigInt(0) && (
                <div>
                  <span style={{ ...css.rainfallLabel, color: T.successText }}>Final payout</span>
                  <div style={{ ...css.rainfallValue, color: T.successText }}>{formatEther(state.finalPayout)} ETH</div>
                </div>
              )}
            </div>
          )}

          {/* Settlement actions */}
          {canAct && (
            <div style={css.actionRow}>
              <button
                onClick={() => onRequestSettlement(tokenId)}
                disabled={isSettlementPending}
                style={actionBtn(isSettlementPending ? 'disabled' : 'ghost')}
              >
                {isSettlementPending ? 'Requesting…' : 'Request settlement →'}
              </button>
              <button
                onClick={() => onSettle(tokenId)}
                disabled={isSettlePending}
                style={actionBtn(isSettlePending ? 'disabled' : 'amber')}
              >
                {isSettlePending ? 'Settling…' : 'Settle →'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}