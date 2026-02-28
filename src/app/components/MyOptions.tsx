'use client';

import { useEffect, useState, CSSProperties } from 'react';
import {
  useAccount, useReadContract, useWriteContract,
  useWaitForTransactionReceipt, usePublicClient,
} from 'wagmi';
import { formatEther, parseEther } from 'viem';
import {
  CONTRACTS,
  WEATHER_OPTION_ABI,
  CCIP_ESCROW_FACTORY_ABI,
  CCIP_ESCROW_ABI,
  OptionType,
} from '../lib/contract';

// ─────────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  cream:         '#f4ede0',
  green:         '#1c2b1e',
  greenMid:      '#2d4a30',
  muted:         '#4a5c4b',
  textMuted:     '#6b6560',
  amber:         '#c9913d',
  amberLight:    'rgba(201,145,61,0.08)',
  amberBorder:   'rgba(201,145,61,0.2)',
  border:        'rgba(28,43,30,0.10)',
  white:         '#ffffff',
  successBg:     '#f0f7f1',
  successBorder: '#a8c9ac',
  successText:   '#14532d',
  errorBg:       '#fef2f0',
  errorBorder:   '#e8b4ad',
  errorText:     '#7c2d12',
  warnBg:        '#fdfaee',
  warnBorder:    '#e8d5a3',
  warnText:      '#78350f',
  blueBg:        '#eff6ff',
  blueBorder:    '#bfdbfe',
  blueText:      '#1e3a5f',
  purpleBg:      '#f5f3ff',
  purpleBorder:  '#c4b5fd',
  purpleText:    '#4c1d95',
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// Sepolia LINK token
const LINK_TOKEN = '0x779877A7B0D9E8603169DdbD7836e478b4624789';

// Only supported destination for now
const FUJI_CHAIN_SELECTOR = BigInt('14767482510784806043');
const FUJI_RECEIVER       = '0x3934A6a5952b2159B87C652b1919F718fb300eD6';

const ERC20_ABI = [
  {
    type: 'function', name: 'approve',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'allowance',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const CCIP_ESCROW_ABI_EXTENDED = [
  ...CCIP_ESCROW_ABI,
  {
    type: 'function' as const,
    name: 'claimAndBridge',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
] as const;

const ZERO = BigInt(0);

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE CSS
// ─────────────────────────────────────────────────────────────────────────────

const RESPONSIVE = `
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes fadeIn  { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }

  .mo-stat-grid, .mo-portfolio-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: ${T.border};
  }
  .mo-stat-grid { margin-top: 1px; }
  .mo-card-header {
    padding: 1.5rem 2rem;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.5rem;
  }
  .mo-timeline-grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 1rem;
    align-items: center;
    padding: 1.25rem;
    background: ${T.white};
    border: 1px solid ${T.border};
    margin-bottom: 1rem;
  }
  .mo-btn-row { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
  .mo-expanded {
    padding: 1.75rem 2rem;
    border-top: 1px solid ${T.border};
    background: ${T.cream};
    animation: fadeIn 0.18s ease;
  }
  .mo-payout-bar { display: flex; justify-content: space-between; align-items: center; }
  .mo-pnl-positive { color: ${T.successText}; }
  .mo-pnl-negative  { color: ${T.errorText};  }
  .mo-pnl-neutral   { color: ${T.textMuted};  }

  @media (max-width: 640px) {
    .mo-stat-grid, .mo-portfolio-grid { grid-template-columns: repeat(2, 1fr); }
    .mo-card-header { padding: 1.25rem; flex-direction: column; gap: 0.75rem; }
    .mo-card-header > div:last-child {
      text-align: left !important; width: 100%;
      display: flex; justify-content: space-between; align-items: center;
    }
    .mo-timeline-grid  { grid-template-columns: 1fr; gap: 0.5rem; }
    .mo-timeline-arrow { display: none; }
    .mo-btn-row        { flex-direction: column; }
    .mo-expanded       { padding: 1.25rem; }
    .mo-payout-bar     { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// STATIC STYLES
// ─────────────────────────────────────────────────────────────────────────────

const css: Record<string, CSSProperties> = {
  topBar:         { height: 3, background: `linear-gradient(90deg, ${T.amber}, ${T.greenMid})` },
  wrap:           { background: T.cream, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: '1rem' },
  portfolioWrap:  { background: T.white, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: '1rem' },
  header:         { padding: '2rem 2.5rem', borderBottom: `1px solid ${T.border}` },
  headerTitle:    { fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 400, color: T.green, lineHeight: 1.1, marginBottom: '0.3rem' },
  headerSub:      { fontSize: '0.82rem', color: T.textMuted, letterSpacing: '0.08em', fontFamily: "'DM Mono', monospace" },
  center:         { padding: '5rem 2.5rem', textAlign: 'center', fontFamily: "'Cormorant Garamond', Georgia, serif", background: T.cream, border: `1px solid ${T.border}` },
  centerTitle:    { fontSize: '1.75rem', fontWeight: 400, color: T.green, marginBottom: '0.6rem' },
  centerSub:      { fontSize: '0.9rem', color: T.textMuted, lineHeight: 1.7 },
  spinnerRing:    { width: 48, height: 48, border: `2px solid ${T.border}`, borderTopColor: T.amber, borderRadius: '50%', margin: '0 auto 2rem', animation: 'spin 0.9s linear infinite' },
  label:          { fontSize: '0.68rem', letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: T.amber, fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '0.5rem' },
  card:           { background: T.white, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.border}`, marginBottom: '0.75rem', overflow: 'hidden', transition: 'border-left-color 0.2s' },
  cardNum:        { fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: T.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: '0.4rem' },
  cardTitle:      { fontSize: '1.25rem', fontWeight: 500, color: T.green },
  badge:          { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.75rem', fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const, fontFamily: "'DM Mono', monospace", border: '1px solid', marginRight: '0.5rem' },
  statCell:       { background: T.white, padding: '1rem 1.25rem' },
  statLabel:      { fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: '0.35rem' },
  statValue:      { fontSize: '1.1rem', fontWeight: 500, color: T.green, fontFamily: "'DM Mono', monospace" },
  timelineLabel:  { fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: '0.3rem' },
  timelineValue:  { fontSize: '0.9rem', color: T.green },
  settlementBox:  { padding: '1.25rem', background: T.successBg, border: `1px solid ${T.successBorder}`, marginBottom: '1rem' },
  otmBox:         { padding: '1.25rem', background: T.warnBg,    border: `1px solid ${T.warnBorder}`,    marginBottom: '1rem' },
  settlingBox:    { padding: '1.25rem', background: T.blueBg,    border: `1px solid ${T.blueBorder}`,    marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  escrowBox:      { padding: '1.25rem', background: T.purpleBg,  border: `1px solid ${T.purpleBorder}`,  marginBottom: '1rem' },
  escrowWarnBox:  { padding: '1rem',    background: T.warnBg,    border: `1px solid ${T.warnBorder}`,    marginTop: '0.75rem', fontSize: '0.82rem', color: T.warnText },
  debugBox:       { padding: '1rem',    background: T.amberLight, border: `1px solid ${T.amberBorder}`,  marginTop: '1rem' },
  portfolioLabel: { padding: '1.25rem 1.5rem', borderBottom: `1px solid ${T.border}` },
  dividerRow:     { height: 1, background: T.border, margin: '1.25rem 0' },
  monoAddr:       { fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', wordBreak: 'break-all' as const, color: T.muted },
  inputRow:       { display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' },
  input:          { flex: 1, padding: '0.65rem 0.85rem', fontFamily: "'DM Mono', monospace", fontSize: '0.82rem', border: `1px solid ${T.purpleBorder}`, background: T.white, color: T.green, outline: 'none' },
};

function actionBtnStyle(variant: 'primary' | 'amber' | 'purple' | 'disabled'): CSSProperties {
  const map = {
    primary:  { bg: T.green,              color: T.cream     },
    amber:    { bg: T.amber,              color: T.green     },
    purple:   { bg: '#6d28d9',            color: '#f5f3ff'   },
    disabled: { bg: 'rgba(28,43,30,0.1)', color: T.textMuted },
  };
  const { bg, color } = map[variant];
  return {
    flex: 1, padding: '0.9rem 1.25rem',
    background: bg, color, border: 'none',
    fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const,
    fontWeight: 700,
    cursor: variant === 'disabled' ? 'not-allowed' : 'pointer',
    fontFamily: "'DM Mono', monospace",
    transition: 'opacity 0.18s',
  };
}

function badgeColor(status: number) {
  return ([
    { bg: T.successBg,  border: T.successBorder, text: T.successText, label: 'Active'   },
    { bg: T.warnBg,     border: T.warnBorder,     text: T.warnText,    label: 'Expired'  },
    { bg: T.blueBg,     border: T.blueBorder,     text: T.blueText,    label: 'Settling' },
    { bg: T.amberLight, border: T.amberBorder,     text: T.amber,       label: 'Settled'  },
  ] as const)[status] ?? { bg: T.cream, border: T.border, text: T.textMuted, label: 'Unknown' };
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Option {
  tokenId: bigint;
  terms: {
    optionType: number;
    latitude:   string;
    longitude:  string;
    startDate:  bigint;
    expiryDate: bigint;
    strikeMM:   bigint;
    spreadMM:   bigint;
    notional:   bigint;
    premium:    bigint;
  };
  state: {
    status:            number;
    buyer:             string;
    createdAt:         bigint;
    actualRainfall:    bigint;
    finalPayout:       bigint;
    ownerAtSettlement: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPLOY ESCROW PANEL
// Shown when the user has no escrow yet. Handles approve + deployAndFundEscrow
// as a two-step flow, auto-advancing after approve confirms.
// ─────────────────────────────────────────────────────────────────────────────

function DeployEscrowPanel({ address }: { address: string }) {
  const [linkAmount, setLinkAmount] = useState('2');
  const [step, setStep] = useState<'idle' | 'approving' | 'deploying' | 'done'>('idle');

  const linkWei = (() => {
    try { return parseEther(linkAmount || '0'); } catch { return ZERO; }
  })();

  const { data: linkBalance } = useReadContract({
    address:      LINK_TOKEN as `0x${string}`,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         [address as `0x${string}`],
  }) as { data: bigint | undefined };

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address:      LINK_TOKEN as `0x${string}`,
    abi:          ERC20_ABI,
    functionName: 'allowance',
    args:         [address as `0x${string}`, CONTRACTS.CCIP_ESCROW_FACTORY as `0x${string}`],
  });

  const { writeContract: approveLINK, data: approveHash } = useWriteContract();
  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: deployEscrow, data: deployHash } = useWriteContract();
  const { isLoading: isDeploying, isSuccess: deploySuccess } = useWaitForTransactionReceipt({ hash: deployHash });

  // After approve confirms, auto-trigger the deploy
  useEffect(() => {
    if (!approveSuccess) return;
    refetchAllowance();
    setStep('deploying');
    deployEscrow({
      address:      CONTRACTS.CCIP_ESCROW_FACTORY as `0x${string}`,
      abi:          CCIP_ESCROW_FACTORY_ABI,
      functionName: 'deployAndFundEscrow',
      args:         [FUJI_CHAIN_SELECTOR, FUJI_RECEIVER as `0x${string}`, linkWei],
    });
  }, [approveSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (deploySuccess) setStep('done');
  }, [deploySuccess]);

  const hasEnoughLink   = linkBalance !== undefined && linkBalance >= linkWei && linkWei > ZERO;
  const alreadyApproved = allowance !== undefined && allowance >= linkWei && linkWei > ZERO;
  const isBusy          = isApproving || isDeploying;
  const linkFloat       = linkBalance !== undefined ? Number(formatEther(linkBalance)).toFixed(2) : '…';

  const handleDeploy = () => {
    if (alreadyApproved) {
      setStep('deploying');
      deployEscrow({
        address:      CONTRACTS.CCIP_ESCROW_FACTORY as `0x${string}`,
        abi:          CCIP_ESCROW_FACTORY_ABI,
        functionName: 'deployAndFundEscrow',
        args:         [FUJI_CHAIN_SELECTOR, FUJI_RECEIVER as `0x${string}`, linkWei],
      });
    } else {
      setStep('approving');
      approveLINK({
        address:      LINK_TOKEN as `0x${string}`,
        abi:          ERC20_ABI,
        functionName: 'approve',
        args:         [CONTRACTS.CCIP_ESCROW_FACTORY as `0x${string}`, linkWei],
      });
    }
  };

  if (step === 'done' || deploySuccess) {
    return (
      <div style={css.escrowBox}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span>✅</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: T.purpleText }}>
            CCIP Escrow deployed successfully
          </span>
        </div>
        <div style={{ fontSize: '0.78rem', color: T.purpleText, lineHeight: 1.6 }}>
          Your escrow is live on Sepolia and funded with {linkAmount} LINK.
          Reload the page to see it and start transferring options.
        </div>
      </div>
    );
  }

  return (
    <div style={css.escrowBox}>
      <div style={{ fontSize: '0.82rem', color: T.purpleText, fontWeight: 700, marginBottom: '0.4rem' }}>
        🔗 Deploy your CCIP Escrow
      </div>
      <div style={{ fontSize: '0.82rem', color: T.purpleText, lineHeight: 1.6, marginBottom: '0.75rem' }}>
        Deploy a personal escrow to enable automatic cross-chain payout to{' '}
        <strong>Avalanche Fuji</strong> via Chainlink CCIP.
        LINK covers bridge fees — typically 0.5–2 LINK per settlement.
      </div>

      {/* LINK balance */}
      <div style={{ fontSize: '0.75rem', color: T.purpleText, marginBottom: '0.5rem' }}>
        Your LINK balance: <strong>{linkFloat} LINK</strong>
        {linkBalance !== undefined && linkWei > ZERO && !hasEnoughLink && (
          <span style={{ color: T.errorText, marginLeft: '0.5rem' }}>
            ⚠ Insufficient — get free LINK at faucets.chain.link
          </span>
        )}
      </div>

      {/* Amount input */}
      <div style={{ fontSize: '0.72rem', color: T.muted }}>LINK to fund escrow with:</div>
      <div style={css.inputRow}>
        <input
          type="number"
          min="0"
          step="0.5"
          value={linkAmount}
          onChange={(e) => setLinkAmount(e.target.value)}
          placeholder="2"
          style={css.input}
          disabled={isBusy}
        />
        <span style={{ fontSize: '0.78rem', color: T.muted, whiteSpace: 'nowrap' }}>LINK</span>
      </div>

      {/* Destination info */}
      <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: T.muted, lineHeight: 1.7 }}>
        Destination chain: <span style={{ fontFamily: "'DM Mono', monospace" }}>Avalanche Fuji</span><br />
        Receiver: <span style={{ fontFamily: "'DM Mono', monospace" }}>{FUJI_RECEIVER}</span>
      </div>

      {/* Step progress */}
      {step !== 'idle' && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: T.purpleText }}>
          {step === 'approving' && (isApproving
            ? '⏳ Step 1/2: Approving LINK spend…'
            : '✓ LINK approved — deploying escrow…')}
          {step === 'deploying' && (isDeploying
            ? '⏳ Step 2/2: Deploying & funding escrow…'
            : '✓ Done!')}
        </div>
      )}

      <button
        onClick={handleDeploy}
        disabled={isBusy || !hasEnoughLink}
        style={{
          ...actionBtnStyle(isBusy || !hasEnoughLink ? 'disabled' : 'purple'),
          flex: 'none',
          width: '100%',
          marginTop: '0.75rem',
        }}
      >
        {isApproving  ? 'Approving LINK…'           :
         isDeploying  ? 'Deploying escrow…'          :
         alreadyApproved ? 'Deploy & fund escrow →'  :
         'Approve LINK & deploy escrow →'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCROW PANEL — shown inside expanded card when Active + not expired + wallet owns it
// ─────────────────────────────────────────────────────────────────────────────

function EscrowPanel({
  tokenId, currentOwner, address, onTransfer, isTransferring,
}: {
  tokenId: bigint; currentOwner: string; address: string;
  onTransfer: (escrow: string) => void; isTransferring: boolean;
}) {
  const { data: escrows } = useReadContract({
    address:      CONTRACTS.CCIP_ESCROW_FACTORY as `0x${string}`,
    abi:          CCIP_ESCROW_FACTORY_ABI,
    functionName: 'getEscrowsByOwner',
    args:         [address as `0x${string}`],
  }) as { data: string[] | undefined };

  const escrowAddress = escrows && escrows.length > 0 ? escrows[0] : undefined;

  const { data: linkBalance } = useReadContract({
    address: escrowAddress as `0x${string}` | undefined,
    abi:     CCIP_ESCROW_ABI,
    functionName: 'linkBalance',
    query:   { enabled: !!escrowAddress },
  }) as { data: bigint | undefined };

  const inEscrow = escrowAddress && currentOwner.toLowerCase() === escrowAddress.toLowerCase();
  const hasLink  = linkBalance !== undefined && linkBalance > ZERO;
  const lowLink  = linkBalance !== undefined && linkBalance > ZERO && linkBalance < BigInt('500000000000000000');
  const noEscrow = !escrows || escrows.length === 0;

  // Already in escrow
  if (inEscrow) {
    return (
      <div style={css.escrowBox}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span>🔗</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: T.purpleText }}>
            In CCIP Escrow — cross-chain payout enabled
          </span>
        </div>
        <div style={css.monoAddr}>{escrowAddress}</div>
        {linkBalance !== undefined && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: T.purpleText }}>
            LINK balance: {formatEther(linkBalance)} LINK
            {lowLink && ' ⚠ Low — consider topping up'}
          </div>
        )}
      </div>
    );
  }

  // No escrow — show deploy UI
  if (noEscrow) {
    return <DeployEscrowPanel address={address} />;
  }

  // Escrow exists — show transfer button
  return (
    <div style={css.escrowBox}>
      <div style={{ fontSize: '0.82rem', color: T.purpleText, fontWeight: 700, marginBottom: '0.6rem' }}>
        🔗 Transfer to CCIP Escrow for cross-chain payout
      </div>
      <div style={{ fontSize: '0.78rem', color: T.purpleText, lineHeight: 1.6, marginBottom: '0.75rem' }}>
        Transfer this NFT to your escrow before expiry. The CRE workflow will
        automatically bridge your payout to Avalanche Fuji after settlement.
      </div>
      <div style={{ ...css.monoAddr, marginBottom: '0.75rem' }}>Escrow: {escrowAddress}</div>
      {linkBalance !== undefined && (
        <div style={{ fontSize: '0.78rem', color: T.purpleText, marginBottom: '0.75rem' }}>
          LINK balance: {formatEther(linkBalance)} LINK
        </div>
      )}
      {!hasLink && (
        <div style={css.escrowWarnBox}>
          ⚠ Escrow has no LINK — bridge will fail at settlement. Fund with at least 2 LINK first.
        </div>
      )}
      {lowLink && (
        <div style={css.escrowWarnBox}>
          ⚠ LINK balance is low ({'<'}0.5 LINK). CCIP fees are typically 0.5–2 LINK.
        </div>
      )}
      <button
        onClick={() => escrowAddress && onTransfer(escrowAddress)}
        disabled={isTransferring || !escrowAddress}
        style={{ ...actionBtnStyle(isTransferring || !escrowAddress ? 'disabled' : 'purple'), flex: 'none', marginTop: '0.25rem' }}
      >
        {isTransferring ? 'Transferring…' : 'Transfer to escrow →'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION CARD
// ─────────────────────────────────────────────────────────────────────────────

function OptionCard({
  tokenId, isExpanded, onToggle,
  onRequestSettlement, onSettle, onClaim, onClaimAndBridge, onTransferToEscrow,
  isSettling, isFinalizing, isClaiming, isBridging, isTransferring,
  onStatsReady,
}: {
  tokenId: bigint; isExpanded: boolean; onToggle: () => void;
  onRequestSettlement: (id: bigint) => void;
  onSettle:            (id: bigint) => void;
  onClaim:             (id: bigint) => void;
  onClaimAndBridge:    (id: bigint, escrow: string) => void;
  onTransferToEscrow:  (id: bigint, escrow: string) => void;
  isSettling: boolean; isFinalizing: boolean; isClaiming: boolean;
  isBridging: boolean; isTransferring: boolean;
  onStatsReady: (premium: bigint, payout: bigint) => void;
}) {
  const { address } = useAccount();

  const { data: option } = useReadContract({
    address:      CONTRACTS.WEATHER_OPTION as `0x${string}`,
    abi:          WEATHER_OPTION_ABI,
    functionName: 'getOption',
    args:         [tokenId],
  }) as { data: Option | undefined };

  const { data: pendingPayout } = useReadContract({
    address:      CONTRACTS.WEATHER_OPTION as `0x${string}`,
    abi:          WEATHER_OPTION_ABI,
    functionName: 'pendingPayouts',
    args:         [tokenId],
  }) as { data: bigint | undefined };

  const { data: currentOwner } = useReadContract({
    address:      CONTRACTS.WEATHER_OPTION as `0x${string}`,
    abi:          WEATHER_OPTION_ABI,
    functionName: 'ownerOf',
    args:         [tokenId],
  }) as { data: string | undefined };

  useEffect(() => {
    if (!option) return;
    onStatsReady(option.terms.premium ?? ZERO, option.state.finalPayout ?? ZERO);
  }, [option]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const now            = Date.now() / 1000;
  const isExpired      = now > Number(terms.expiryDate);
  const maxPayout      = terms.notional * terms.spreadMM;
  const badge          = badgeColor(state.status);
  const isCall         = terms.optionType === OptionType.CALL;
  const isSettled      = state.status === 3;
  const isSettlingNow  = state.status === 2;
  const payoutAmount   = state.finalPayout > ZERO ? state.finalPayout : (pendingPayout ?? ZERO);
  const isITM          = payoutAmount > ZERO;
  const pnl            = payoutAmount - terms.premium;
  const pnlPositive    = pnl >= ZERO;

  const isInEscrow     = currentOwner && address && currentOwner.toLowerCase() !== address.toLowerCase();
  const escrowAddress  = isInEscrow ? currentOwner : undefined;
  const walletOwnsIt   = currentOwner && address && currentOwner.toLowerCase() === address.toLowerCase();
  const showEscrowPanel = state.status === 0 && !isExpired && walletOwnsIt;
  const hasClaimablePayout = state.status === 3 && pendingPayout && pendingPayout > ZERO;

  return (
    <div style={{ ...css.card, borderLeftColor: isExpanded ? T.amber : T.border }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mo-card-header" onClick={onToggle}>
        <div style={{ flex: 1 }}>
          <div style={css.cardNum}>Option #{tokenId.toString()}</div>
          <div style={css.cardTitle}>{terms.latitude}°, {terms.longitude}°</div>
          <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ ...css.badge, background: badge.bg, borderColor: badge.border, color: badge.text }}>
              {badge.label}
            </span>
            <span style={{
              ...css.badge,
              background:  isCall ? T.blueBg : T.amberLight,
              borderColor: isCall ? T.blueBorder : T.amberBorder,
              color:       isCall ? T.blueText : T.amber,
            }}>
              {isCall ? 'Call' : 'Put'}
            </span>
            {isExpired && state.status === 0 && (
              <span style={{ ...css.badge, background: T.errorBg, borderColor: T.errorBorder, color: T.errorText }}>
                Ready to settle
              </span>
            )}
            {isInEscrow && state.status === 0 && (
              <span style={{ ...css.badge, background: T.purpleBg, borderColor: T.purpleBorder, color: T.purpleText }}>
                🔗 In escrow
              </span>
            )}
            {isSettled && (
              <span style={{
                ...css.badge,
                background:  pnlPositive ? T.successBg : T.errorBg,
                borderColor: pnlPositive ? T.successBorder : T.errorBorder,
                color:       pnlPositive ? T.successText : T.errorText,
              }}>
                P&L {pnlPositive ? '+' : ''}{formatEther(pnl).slice(0, 9)} ETH
              </span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={css.label}>Max payout</span>
          <div className="mo-payout-bar">
            <div style={{ fontSize: '1.6rem', fontWeight: 400, color: T.green }}>
              {formatEther(maxPayout)} ETH
            </div>
            <div style={{ fontSize: '0.72rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", marginTop: '0.25rem', marginLeft: '0.5rem' }}>
              {isExpanded ? '↑' : '↓'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat strip ─────────────────────────────────────────────────────── */}
      <div className="mo-stat-grid">
        {[
          { label: 'Strike',  value: `${terms.strikeMM.toString()} mm` },
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

      {/* ── Expanded panel ─────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="mo-expanded" onClick={(e) => e.stopPropagation()}>

          <span style={css.label}>Coverage period</span>
          <div className="mo-timeline-grid">
            <div>
              <div style={css.timelineLabel}>Start</div>
              <div style={css.timelineValue}>{new Date(Number(terms.startDate) * 1000).toLocaleString()}</div>
            </div>
            <div className="mo-timeline-arrow" style={{ fontSize: '1.2rem', color: T.border, textAlign: 'center' }}>→</div>
            <div>
              <div style={css.timelineLabel}>Expiry</div>
              <div style={css.timelineValue}>{new Date(Number(terms.expiryDate) * 1000).toLocaleString()}</div>
            </div>
          </div>

          {/* Escrow panel (deploy or transfer) */}
          {showEscrowPanel && address && (
            <>
              <div style={css.dividerRow} />
              <EscrowPanel
                tokenId={tokenId}
                currentOwner={currentOwner ?? ''}
                address={address}
                onTransfer={(escrow) => onTransferToEscrow(tokenId, escrow)}
                isTransferring={isTransferring}
              />
            </>
          )}

          {/* Oracle waiting */}
          {isSettlingNow && (
            <div style={css.settlingBox}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: T.blueText, animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.82rem', color: T.blueText, fontWeight: 600, marginBottom: '0.2rem' }}>
                  Waiting for rainfall oracle
                </div>
                <div style={{ fontSize: '0.78rem', color: T.blueText, opacity: 0.8 }}>
                  Chainlink Functions is fetching historical rainfall data. Once fulfilled, click "Finalize settlement" below.
                </div>
              </div>
            </div>
          )}

          {/* Settlement result */}
          {isSettled && (
            <>
              <span style={{ ...css.label, marginTop: '1.25rem' }}>Settlement result</span>
              {isITM ? (
                <div style={css.settlementBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', color: T.successText }}>Actual rainfall</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: T.green }}>{state.actualRainfall.toString()} mm</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.successBorder}`, paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', color: T.successText }}>Payout</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.25rem', fontWeight: 700, color: T.successText }}>+{formatEther(payoutAmount)} ETH</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.successBorder}`, paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', color: T.successText }}>Net P&amp;L</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: pnlPositive ? T.successText : T.errorText }}>
                      {pnlPositive ? '+' : ''}{formatEther(pnl)} ETH
                    </span>
                  </div>
                </div>
              ) : (
                <div style={css.otmBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', color: T.warnText }}>Actual rainfall</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: T.green }}>{state.actualRainfall.toString()} mm</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.warnBorder}`, paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', color: T.warnText }}>Payout</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: T.warnText }}>0.000 ETH — out of the money</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.warnBorder}`, paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', color: T.warnText }}>Net P&amp;L</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: T.errorText }}>-{formatEther(terms.premium)} ETH</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Settlement action buttons */}
          {isExpired && (state.status === 0 || state.status === 2) && (
            <div className="mo-btn-row">
              <button
                onClick={(e) => { e.stopPropagation(); onRequestSettlement(tokenId); }}
                disabled={isSettling || state.status === 2}
                style={actionBtnStyle(isSettling || state.status === 2 ? 'disabled' : 'amber')}
              >
                {state.status === 2 ? '1 — Requested ✓' : isSettling ? 'Requesting…' : '1 — Request settlement'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onSettle(tokenId); }}
                disabled={isFinalizing || state.status === 0}
                style={actionBtnStyle(isFinalizing || state.status === 0 ? 'disabled' : 'primary')}
              >
                {isFinalizing ? 'Finalizing…' : '2 — Finalize settlement'}
              </button>
            </div>
          )}

          {/* Claim / Bridge — smart routing based on who owns the NFT */}
          {hasClaimablePayout && (
            <div style={{ marginTop: '1.25rem' }}>
              {isInEscrow && escrowAddress ? (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onClaimAndBridge(tokenId, escrowAddress); }}
                    disabled={isBridging}
                    style={{ ...actionBtnStyle(isBridging ? 'disabled' : 'purple'), flex: 'none', width: '100%' }}
                  >
                    {isBridging ? 'Bridging…' : `Bridge ${formatEther(pendingPayout!)} ETH via CCIP →`}
                  </button>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: T.purpleText, lineHeight: 1.5 }}>
                    🔗 Your escrow will claim and bridge the payout to Avalanche Fuji.
                  </div>
                </>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onClaim(tokenId); }}
                  disabled={isClaiming}
                  style={{ ...actionBtnStyle(isClaiming ? 'disabled' : 'amber'), flex: 'none', width: '100%' }}
                >
                  {isClaiming ? 'Claiming…' : `Claim ${formatEther(pendingPayout!)} ETH →`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

function PortfolioSummary({ count, premiumsPaid, payoutsReceived }: {
  count: number; premiumsPaid: bigint; payoutsReceived: bigint;
}) {
  const netPnL      = payoutsReceived - premiumsPaid;
  const pnlPositive = netPnL >= ZERO;
  const pnlClass    = netPnL === ZERO ? 'mo-pnl-neutral' : pnlPositive ? 'mo-pnl-positive' : 'mo-pnl-negative';

  return (
    <div style={css.portfolioWrap}>
      <div style={css.portfolioLabel}><span style={css.label}>Portfolio summary</span></div>
      <div className="mo-portfolio-grid">
        {[
          { label: 'Options held',     value: count.toString(),                                   cls: '' },
          { label: 'Premiums paid',    value: `${formatEther(premiumsPaid).slice(0, 10)} ETH`,    cls: '' },
          { label: 'Payouts received', value: `${formatEther(payoutsReceived).slice(0, 10)} ETH`, cls: '' },
          { label: 'Net P&L',
            value: `${pnlPositive && netPnL !== ZERO ? '+' : ''}${formatEther(netPnL).slice(0, 10)} ETH`,
            cls: pnlClass },
        ].map(({ label, value, cls }) => (
          <div key={label} style={{ ...css.statCell, borderRight: `1px solid ${T.border}` }}>
            <div style={css.statLabel}>{label}</div>
            <div className={cls} style={css.statValue}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function MyOptions() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [mounted, setMounted]           = useState(false);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [userTokenIds, setUserTokenIds] = useState<bigint[]>([]);
  const [isScanning, setIsScanning]     = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const [premiumsPaid, setPremiumsPaid]       = useState<bigint>(ZERO);
  const [payoutsReceived, setPayoutsReceived] = useState<bigint>(ZERO);
  const [counted, setCounted]                 = useState<Map<string, { premium: bigint; payout: bigint }>>(new Map());

  useEffect(() => setMounted(true), []);

  const { data: balance } = useReadContract({
    address:      CONTRACTS.WEATHER_OPTION as `0x${string}`,
    abi:          WEATHER_OPTION_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    query:        { enabled: mounted && isConnected && !!address },
  }) as { data: bigint | undefined };

  // ── Scan: wallet + current escrow factory only ────────────────────────────
  useEffect(() => {
    if (!mounted || !isConnected || !address || !publicClient) return;
    (async () => {
      setIsScanning(true);
      setScanComplete(false);
      setPremiumsPaid(ZERO);
      setPayoutsReceived(ZERO);
      setCounted(new Map());

      // Fetch escrows from the current factory only
      let escrowAddresses: string[] = [];
      try {
        const escrows = await publicClient.readContract({
          address:      CONTRACTS.CCIP_ESCROW_FACTORY as `0x${string}`,
          abi:          CCIP_ESCROW_FACTORY_ABI,
          functionName: 'getEscrowsByOwner',
          args:         [address as `0x${string}`],
        });
        escrowAddresses = (escrows as string[]) ?? [];
      } catch { /* ignore — factory may have no escrows for this wallet */ }

      const owned: bigint[] = [];
      for (let i = 0; i < 50; i++) {
        try {
          const owner = await publicClient.readContract({
            address:      CONTRACTS.WEATHER_OPTION as `0x${string}`,
            abi:          WEATHER_OPTION_ABI,
            functionName: 'ownerOf',
            args:         [BigInt(i)],
          }) as string;

          const ownerLower    = owner.toLowerCase();
          const isDirectOwner = ownerLower === address.toLowerCase();
          const isInMyEscrow  = escrowAddresses.some(e => e.toLowerCase() === ownerLower);

          if (isDirectOwner || isInMyEscrow) owned.push(BigInt(i));
        } catch { /* token doesn't exist */ }
      }

      setUserTokenIds(owned);
      setIsScanning(false);
      setScanComplete(true);
    })();
  }, [address, mounted, isConnected, publicClient]);

  const handleStatsReady = (tokenId: bigint, premium: bigint, payout: bigint) => {
    const key = tokenId.toString();
    setCounted(prev => {
      const existing = prev.get(key);
      if (existing) {
        setPremiumsPaid(p => p - existing.premium + premium);
        setPayoutsReceived(p => p - existing.payout + payout);
      } else {
        setPremiumsPaid(p => p + premium);
        setPayoutsReceived(p => p + payout);
      }
      const next = new Map(prev);
      next.set(key, { premium, payout });
      return next;
    });
  };

  // ── Write hooks ───────────────────────────────────────────────────────────
  const { writeContract: requestSettlement, data: settlementHash } = useWriteContract();
  const { isLoading: isSettling }    = useWaitForTransactionReceipt({ hash: settlementHash });

  const { writeContract: settle,     data: settleHash }            = useWriteContract();
  const { isLoading: isFinalizing }  = useWaitForTransactionReceipt({ hash: settleHash });

  const { writeContract: claimPayout, data: claimHash }           = useWriteContract();
  const { isLoading: isClaiming }    = useWaitForTransactionReceipt({ hash: claimHash });

  const { writeContract: claimAndBridgeFn, data: bridgeHash }     = useWriteContract();
  const { isLoading: isBridging }    = useWaitForTransactionReceipt({ hash: bridgeHash });

  const { writeContract: transferNFT, data: transferHash }        = useWriteContract();
  const { isLoading: isTransferring } = useWaitForTransactionReceipt({ hash: transferHash });

  const handleTransferToEscrow = (tokenId: bigint, escrow: string) => {
    if (!address) return;
    transferNFT({
      address:      CONTRACTS.WEATHER_OPTION as `0x${string}`,
      abi:          WEATHER_OPTION_ABI,
      functionName: 'safeTransferFrom',
      args:         [address, escrow as `0x${string}`, tokenId],
    });
  };

  const handleClaimAndBridge = (tokenId: bigint, escrow: string) => {
    claimAndBridgeFn({
      address:      escrow as `0x${string}`,
      abi:          CCIP_ESCROW_ABI_EXTENDED,
      functionName: 'claimAndBridge',
      args:         [tokenId],
    });
  };

  if (!mounted) return null;

  if (!isConnected) {
    return (
      <div style={css.center}>
        <style>{RESPONSIVE}</style>
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
        <style>{RESPONSIVE}</style>
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
        <style>{RESPONSIVE}</style>
        <div style={css.topBar} />
        <div style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📭</div>
          <h2 style={css.centerTitle}>No options found</h2>
          <p style={{ ...css.centerSub, maxWidth: 400, margin: '0 auto 2rem' }}>
            {balance && Number(balance) > 0
              ? `Your wallet holds ${balance.toString()} NFT(s) but none were found in scan range 0–49.`
              : 'Create your first weather protection option to get started.'}
          </p>
        </div>
        <div style={css.debugBox}>
          <span style={css.label}>Debug information</span>
          {[
            ['Address',        address ?? '—'],
            ['NFT balance',    balance?.toString() ?? '0'],
            ['Contract',       CONTRACTS.WEATHER_OPTION],
            ['Factory',        CONTRACTS.CCIP_ESCROW_FACTORY],
            ['Tokens scanned', '0–49'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: `1px solid ${T.amberBorder}`, fontSize: '0.82rem', flexWrap: 'wrap', gap: '0.25rem' }}>
              <span style={{ color: T.textMuted }}>{k}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", color: T.green, fontSize: '0.72rem', wordBreak: 'break-all' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{RESPONSIVE}</style>

      <div style={{ ...css.wrap, marginBottom: '1rem' }}>
        <div style={css.topBar} />
        <div style={css.header}>
          <span style={css.label}>Portfolio</span>
          <h1 style={css.headerTitle}>My weather options</h1>
          <p style={css.headerSub}>{userTokenIds.length} option{userTokenIds.length !== 1 ? 's' : ''} found</p>
        </div>
      </div>

      <PortfolioSummary
        count={userTokenIds.length}
        premiumsPaid={premiumsPaid}
        payoutsReceived={payoutsReceived}
      />

      {userTokenIds.map((tokenId) => (
        <OptionCard
          key={tokenId.toString()}
          tokenId={tokenId}
          isExpanded={expandedId === tokenId.toString()}
          onToggle={() => setExpandedId(expandedId === tokenId.toString() ? null : tokenId.toString())}
          onRequestSettlement={(id) => requestSettlement({
            address: CONTRACTS.WEATHER_OPTION as `0x${string}`, abi: WEATHER_OPTION_ABI,
            functionName: 'requestSettlement', args: [id],
          })}
          onSettle={(id) => settle({
            address: CONTRACTS.WEATHER_OPTION as `0x${string}`, abi: WEATHER_OPTION_ABI,
            functionName: 'settle', args: [id],
          })}
          onClaim={(id) => claimPayout({
            address: CONTRACTS.WEATHER_OPTION as `0x${string}`, abi: WEATHER_OPTION_ABI,
            functionName: 'claimPayout', args: [id],
          })}
          onClaimAndBridge={handleClaimAndBridge}
          onTransferToEscrow={handleTransferToEscrow}
          isSettling={isSettling}
          isFinalizing={isFinalizing}
          isClaiming={isClaiming}
          isBridging={isBridging}
          isTransferring={isTransferring}
          onStatsReady={(premium, payout) => handleStatsReady(tokenId, premium, payout)}
        />
      ))}
    </>
  );
}