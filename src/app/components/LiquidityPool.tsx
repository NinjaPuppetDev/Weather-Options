'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { VAULT_ABI, WETH_ABI, CONTRACTS } from '../lib/contract';

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
};

// ─── Dynamic style helpers ────────────────────────────────────────────────────
function actionBtn(variant: 'primary' | 'amber' | 'ghost' | 'disabled'): CSSProperties {
  const map = {
    primary:  { bg: T.green,  color: '#f4ede0', cursor: 'pointer' },
    amber:    { bg: T.amber,  color: T.green,   cursor: 'pointer' },
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
    transition: 'background 0.18s',
    marginBottom: '0.5rem',
  };
}

function alertBox(variant: 'success' | 'error'): CSSProperties {
  const ok = variant === 'success';
  return {
    padding: '0.9rem 1.25rem',
    background: ok ? T.successBg : T.errorBg,
    border: `1px solid ${ok ? T.successBorder : T.errorBorder}`,
    marginBottom: '1rem',
    fontSize: '0.85rem',
    color: ok ? T.successText : T.errorText,
  };
}

// ─── Static styles ────────────────────────────────────────────────────────────
const css: Record<string, CSSProperties> = {
  root: { fontFamily: "'Cormorant Garamond', Georgia, serif" },
  topBar: { height: 3, background: `linear-gradient(90deg, ${T.amber}, ${T.greenMid})` },
  wrap: { background: T.cream, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: '1.25rem' },
  // Header
  header: { padding: '2rem 2.5rem', borderBottom: `1px solid ${T.border}` },
  headerTitle: { fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 400, color: T.green, lineHeight: 1.1, marginBottom: '0.3rem' },
  headerSub: { fontSize: '0.82rem', color: T.textMuted, letterSpacing: '0.08em', fontFamily: "'DM Mono', monospace" },
  // Metrics strip
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: T.border },
  metricCell: { padding: '1.5rem 2rem', background: T.white },
  metricLabel: { fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", marginBottom: '0.4rem', display: 'block' },
  metricValue: { fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', fontWeight: 400, color: T.green, fontFamily: "'Cormorant Garamond', Georgia, serif" },
  metricSub: { fontSize: '0.72rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginTop: '0.2rem' },
  // Sub-grid 3-col secondary stats
  secondaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: T.border, borderTop: `1px solid ${T.border}` },
  secondaryCell: { background: T.cream, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  secondaryLabel: { fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace" },
  secondaryValue: { fontSize: '0.95rem', fontFamily: "'DM Mono', monospace", color: T.green },
  // User position
  posGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: T.border, borderTop: `1px solid ${T.border}` },
  posCell: { background: T.white, padding: '1.25rem 2rem' },
  posLabel: { fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: '0.35rem', display: 'block' },
  posValue: { fontSize: '1.4rem', fontWeight: 400, color: T.green, fontFamily: "'Cormorant Garamond', Georgia, serif" },
  // Action panels
  panelGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: T.border, borderTop: `1px solid ${T.border}` },
  panel: { padding: '2rem 2rem 2.5rem', background: T.cream },
  panelLabel: { fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", marginBottom: '0.5rem', display: 'block' },
  panelTitle: { fontSize: '1.2rem', fontWeight: 500, color: T.green, marginBottom: '1.25rem' },
  noteBox: { padding: '1rem', background: T.amberLight, border: `1px solid ${T.amberBorder}`, marginBottom: '1.25rem', fontSize: '0.82rem', color: T.muted, lineHeight: 1.7 },
  noteTitle: { fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '0.5rem' },
  input: { width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${T.border}`, background: T.white, outline: 'none', fontSize: '1rem', color: T.green, fontFamily: "'Cormorant Garamond', Georgia, serif", boxSizing: 'border-box', marginBottom: '1rem', transition: 'border-color 0.2s' },
  maxNote: { fontSize: '0.72rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: '1rem', marginTop: '-0.5rem' },
  divider: { height: 1, background: T.border, margin: '0' },
  // How it works
  howGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: T.border, borderTop: `1px solid ${T.border}` },
  howCell: { padding: '2rem', background: T.white },
  howIcon: { fontSize: '1.5rem', marginBottom: '0.75rem' },
  howTitle: { fontSize: '1rem', fontWeight: 600, color: T.green, marginBottom: '0.5rem' },
  howDesc: { fontSize: '0.88rem', color: T.muted, lineHeight: 1.75 },
  label: { fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", marginBottom: '0.5rem', display: 'block' },
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function LiquidityPool() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [needsApproval, setNeedsApproval] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { data: metricsData, refetch: refetchMetrics }    = useReadContract({ address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'getMetrics',         query: { enabled: mounted && isConnected } });
  const { data: lpBalance, refetch: refetchLPBalance }    = useReadContract({ address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'balanceOf',            args: address ? [address] : undefined, query: { enabled: mounted && isConnected && !!address } });
  const { data: wethBalance, refetch: refetchWETH }       = useReadContract({ address: CONTRACTS.WETH, abi: WETH_ABI, functionName: 'balanceOf',             args: address ? [address] : undefined, query: { enabled: mounted && isConnected && !!address } });
  const { data: wethAllowance, refetch: refetchAllowance }= useReadContract({ address: CONTRACTS.WETH, abi: WETH_ABI, functionName: 'allowance',             args: address ? [address, CONTRACTS.VAULT] : undefined, query: { enabled: mounted && isConnected && !!address } });
  const { data: maxWithdraw }                             = useReadContract({ address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'maxWithdraw',          args: address ? [address] : undefined, query: { enabled: mounted && isConnected && !!address } });

  const { writeContract: wrapETH, data: wrapHash }     = useWriteContract();
  const { isLoading: isWrapping, isSuccess: isWrapSuccess }       = useWaitForTransactionReceipt({ hash: wrapHash });
  const { writeContract: approve, data: approveHash }  = useWriteContract();
  const { isLoading: isApproving, isSuccess: isApproveSuccess }   = useWaitForTransactionReceipt({ hash: approveHash });
  const { writeContract: deposit, data: depositHash, error: depositError } = useWriteContract();
  const { isLoading: isDepositPending, isSuccess: isDepositSuccess }       = useWaitForTransactionReceipt({ hash: depositHash });
  const { writeContract: withdraw, data: withdrawHash, error: withdrawError } = useWriteContract();
  const { isLoading: isWithdrawPending, isSuccess: isWithdrawSuccess }        = useWaitForTransactionReceipt({ hash: withdrawHash });

  useEffect(() => {
    if (depositAmount && wethAllowance !== undefined) {
      try { setNeedsApproval(parseEther(depositAmount) > (wethAllowance as bigint)); } catch { /* invalid amount */ }
    }
  }, [depositAmount, wethAllowance]);

  useEffect(() => {
    if (isWrapSuccess || isApproveSuccess || isDepositSuccess || isWithdrawSuccess) {
      setTimeout(() => { refetchMetrics(); refetchLPBalance(); refetchWETH(); refetchAllowance(); }, 2000);
    }
  }, [isWrapSuccess, isApproveSuccess, isDepositSuccess, isWithdrawSuccess, refetchMetrics, refetchLPBalance, refetchWETH, refetchAllowance]);

  const handleWrapETH     = () => { if (!depositAmount) return; wrapETH({ address: CONTRACTS.WETH, abi: WETH_ABI, functionName: 'deposit', value: parseEther(depositAmount) }); };
  const handleApprove     = () => { if (!depositAmount) return; approve({ address: CONTRACTS.WETH, abi: WETH_ABI, functionName: 'approve', args: [CONTRACTS.VAULT, parseEther(depositAmount)] }); };
  const handleDeposit     = () => { if (!depositAmount || !address) return; deposit({ address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'deposit', args: [parseEther(depositAmount), address] }); setDepositAmount(''); };
  const handleWithdraw    = () => { if (!withdrawAmount || !address) return; withdraw({ address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'withdraw', args: [parseEther(withdrawAmount), address, address] }); setWithdrawAmount(''); };

  if (!mounted) return null;

  if (!isConnected) {
    return (
      <div style={{ ...css.wrap, textAlign: 'center', padding: '5rem 2.5rem' }}>
        <div style={css.topBar} />
        <div style={{ fontSize: '2.5rem', marginBottom: '1.25rem' }}>💧</div>
        <h2 style={{ ...css.headerTitle, marginBottom: '0.5rem' }}>Liquidity Pool</h2>
        <p style={{ fontSize: '0.9rem', color: T.textMuted }}>Connect your wallet to provide or manage liquidity.</p>
      </div>
    );
  }

  const metrics = metricsData as [bigint, bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
  const [tvl, locked, available, utilization, premiums, payouts, netPnL] = metrics ?? Array(7).fill(BigInt(0)) as bigint[];
  const netPositive = (netPnL as bigint) >= BigInt(0);

  return (
    <div style={css.root}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Mono:wght@400;700&display=swap'); input:focus { border-color: ${T.amber} !important; outline: none; }`}</style>

      {/* ── Pool overview ── */}
      <div style={css.wrap}>
        <div style={css.topBar} />
        <div style={css.header}>
          <span style={css.label}>Liquidity Pool</span>
          <h2 style={css.headerTitle}>ERC-4626 vault overview</h2>
          <p style={css.headerSub}>Chainlink-automated, 80% max utilization</p>
        </div>

        {/* Primary metrics */}
        <div style={css.metricsGrid}>
          {[
            { label: 'Total value locked', value: `${formatEther(tvl as bigint)} ETH`, sub: 'vault TVL' },
            { label: 'Available liquidity', value: `${formatEther(available as bigint)} ETH`, sub: `${formatEther(locked as bigint)} ETH locked` },
            { label: 'Utilization rate', value: `${Number(utilization as bigint) / 100}%`, sub: '80% maximum' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={css.metricCell}>
              <span style={css.metricLabel}>{label}</span>
              <div style={css.metricValue}>{value}</div>
              <div style={css.metricSub}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Secondary stats */}
        <div style={css.secondaryGrid}>
          <div style={css.secondaryCell}>
            <span style={css.secondaryLabel}>Total premiums earned</span>
            <span style={{ ...css.secondaryValue, color: T.successText }}>+{formatEther(premiums as bigint)} ETH</span>
          </div>
          <div style={css.secondaryCell}>
            <span style={css.secondaryLabel}>Total payouts made</span>
            <span style={{ ...css.secondaryValue, color: T.errorText }}>−{formatEther(payouts as bigint)} ETH</span>
          </div>
          <div style={css.secondaryCell}>
            <span style={css.secondaryLabel}>Net P&amp;L</span>
            <span style={{ ...css.secondaryValue, color: netPositive ? T.successText : T.errorText }}>
              {netPositive ? '+' : '−'}{formatEther(netPositive ? (netPnL as bigint) : -(netPnL as bigint))} ETH
            </span>
          </div>
        </div>
      </div>

      {/* ── User position + actions ── */}
      <div style={css.wrap}>
        <div style={css.header}>
          <span style={css.label}>Your position</span>
          <h2 style={css.headerTitle}>Manage liquidity</h2>
        </div>

        {/* Position cells */}
        <div style={css.posGrid}>
          <div style={css.posCell}>
            <span style={css.posLabel}>LP tokens held</span>
            <div style={css.posValue}>{lpBalance ? formatEther(lpBalance as bigint) : '0'}</div>
          </div>
          <div style={css.posCell}>
            <span style={css.posLabel}>WETH balance</span>
            <div style={css.posValue}>{wethBalance ? formatEther(wethBalance as bigint) : '0'}</div>
          </div>
        </div>

        {/* Success / error messages */}
        <div style={{ padding: '0 0', borderTop: `1px solid ${T.border}` }}>
          {isWrapSuccess    && <div style={alertBox('success')}>ETH wrapped to WETH successfully.</div>}
          {isApproveSuccess && <div style={alertBox('success')}>WETH approved for the vault.</div>}
          {isDepositSuccess && <div style={alertBox('success')}>Deposit confirmed — LP tokens issued.</div>}
          {isWithdrawSuccess&& <div style={alertBox('success')}>Withdrawal confirmed.</div>}
          {depositError     && <div style={alertBox('error')}><strong>Deposit error:</strong> {depositError.message}</div>}
          {withdrawError    && <div style={alertBox('error')}><strong>Withdraw error:</strong> {withdrawError.message}</div>}
        </div>

        {/* Action panels */}
        <div style={css.panelGrid}>
          {/* Deposit */}
          <div style={css.panel}>
            <span style={css.panelLabel}>Step 1–3</span>
            <h3 style={css.panelTitle}>Provide liquidity</h3>

            <div style={css.noteBox}>
              <span style={css.noteTitle}>Three-step process</span>
              The vault accepts WETH only. Wrap your ETH first, approve the vault to spend it, then deposit to receive LP tokens representing your share.
            </div>

            <input
              type="number" step="0.01" placeholder="Amount in ETH"
              value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
              style={css.input}
            />

            <button onClick={handleWrapETH} disabled={!depositAmount || isWrapping}
              style={actionBtn(!depositAmount || isWrapping ? 'disabled' : 'ghost')}>
              {isWrapping ? 'Wrapping…' : '1 — Wrap ETH → WETH'}
            </button>

            <button onClick={handleApprove} disabled={!depositAmount || !needsApproval || isApproving}
              style={actionBtn(!depositAmount || !needsApproval || isApproving ? 'disabled' : 'ghost')}>
              {isApproving ? 'Approving…' : needsApproval ? '2 — Approve WETH' : '2 — Already approved ✓'}
            </button>

            <button onClick={handleDeposit} disabled={!depositAmount || needsApproval || isDepositPending}
              style={actionBtn(!depositAmount || needsApproval || isDepositPending ? 'disabled' : 'amber')}>
              {isDepositPending ? 'Depositing…' : '3 — Deposit & receive LP tokens →'}
            </button>
          </div>

          {/* Withdraw */}
          <div style={{ ...css.panel, borderLeft: `1px solid ${T.border}` }}>
            <span style={css.panelLabel}>Withdraw</span>
            <h3 style={css.panelTitle}>Reclaim liquidity</h3>

            <div style={css.noteBox}>
              <span style={css.noteTitle}>Availability</span>
              Only unlocked funds can be withdrawn. Capital backing active options remains locked until those options settle.
            </div>

            <input
              type="number" step="0.01" placeholder="Amount in ETH"
              value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
              style={css.input}
            />

            {maxWithdraw !== undefined && (
              <p style={css.maxNote}>
                Max withdrawable: {formatEther(maxWithdraw as bigint)} ETH
              </p>
            )}

            <button onClick={handleWithdraw} disabled={!withdrawAmount || isWithdrawPending}
              style={actionBtn(!withdrawAmount || isWithdrawPending ? 'disabled' : 'primary')}>
              {isWithdrawPending ? 'Withdrawing…' : 'Withdraw →'}
            </button>
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div style={css.wrap}>
        <div style={css.header}>
          <span style={css.label}>Protocol mechanics</span>
          <h2 style={css.headerTitle}>How liquidity provision works</h2>
        </div>
        <div style={css.howGrid}>
          {[
            { icon: '💵', title: 'Earn premiums', desc: 'Every option buyer pays a premium into the vault. As a liquidity provider, you earn a proportional share of all premiums collected.' },
            { icon: '⚖️', title: 'Take on risk', desc: 'If options expire in-the-money, payouts are funded from the vault. Your maximum loss is bounded by your deposited capital.' },
            { icon: '🔒', title: 'Capital efficiency', desc: 'Only a maximum of 80% of TVL can be locked at any time. Up to 20% per location. This keeps the vault protected from correlated events.' },
            { icon: '🎫', title: 'LP tokens', desc: 'Receive ERC-4626 vault shares representing your proportional claim. Redeem them at any time for your share of the unlocked pool.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={css.howCell}>
              <div style={css.howIcon}>{icon}</div>
              <div style={css.howTitle}>{title}</div>
              <p style={css.howDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}