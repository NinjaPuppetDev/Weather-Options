'use client';

import { useState, useEffect, useReducer, useCallback, useMemo, useRef, CSSProperties } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import {
  WEATHER_OPTION_ABI,
  PREMIUM_CONSUMER_ABI,
  VAULT_ABI,
  CONTRACTS,
  OptionType,
  CreateOptionParams,
} from '../lib/contract';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  cream:      '#f4ede0',
  green:      '#1c2b1e',
  greenMid:   '#2d4a30',
  greenMuted: '#4a5c4b',
  amber:      '#c9913d',
  amberLight: 'rgba(201,145,61,0.10)',
  amberBorder:'rgba(201,145,61,0.25)',
  border:     'rgba(28,43,30,0.12)',
  borderHover:'rgba(28,43,30,0.28)',
  text:       '#1c2b1e',
  textMuted:  '#6b6560',
  white:      '#ffffff',
  errorBg:    '#fef2f0',
  errorBorder:'#e8b4ad',
  errorText:  '#7c2d12',
  successBg:  '#f0f7f1',
  successBorder:'#a8c9ac',
  successText:'#14532d',
  warnBg:     '#fdfaee',
  warnBorder: '#e8d5a3',
  warnText:   '#78350f',
};

// ─── Dynamic style functions (standalone — avoids Record<string,CSSProperties> conflicts) ──
function sVaultBanner(ok: boolean): CSSProperties {
  return {
    padding: '1.25rem 1.5rem',
    background: ok ? T.successBg : T.errorBg,
    border: `1px solid ${ok ? T.successBorder : T.errorBorder}`,
    marginBottom: '2.25rem',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '0.75rem',
  };
}
function sTypeCard(active: boolean, accent: string): CSSProperties {
  return {
    padding: '1.5rem',
    background: active ? T.white : 'transparent',
    border: `2px solid ${active ? accent : T.border}`,
    cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
    textAlign: 'left', fontFamily: "'Cormorant Garamond', Georgia, serif",
  };
}
function sLocCard(active: boolean): CSSProperties {
  return {
    padding: '1rem 0.75rem',
    background: active ? T.white : 'transparent',
    border: `2px solid ${active ? T.amber : T.border}`,
    cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
    textAlign: 'center', fontFamily: "'Cormorant Garamond', Georgia, serif",
  };
}
function sInput(error?: boolean): CSSProperties {
  return {
    width: '100%', padding: '0.65rem 0.9rem',
    border: `1.5px solid ${error ? T.errorBorder : T.border}`,
    background: error ? T.errorBg : T.white,
    outline: 'none', fontSize: '0.95rem', color: T.green,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    transition: 'border-color 0.2s', boxSizing: 'border-box',
  };
}
function sPrimaryBtn(disabled: boolean): CSSProperties {
  return {
    width: '100%', padding: '1.1rem',
    background: disabled ? 'rgba(28,43,30,0.25)' : T.green,
    color: disabled ? 'rgba(28,43,30,0.5)' : '#f4ede0',
    border: 'none', fontSize: '0.82rem', letterSpacing: '0.22em',
    textTransform: 'uppercase', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: "'Cormorant Garamond', Georgia, serif", transition: 'background 0.2s',
  };
}
function sAlertBox(variant: 'error' | 'success' | 'warn' | 'info'): CSSProperties {
  const map = {
    error:   { bg: T.errorBg,   border: T.errorBorder   },
    success: { bg: T.successBg, border: T.successBorder },
    warn:    { bg: T.warnBg,    border: T.warnBorder    },
    info:    { bg: '#eff6ff',   border: '#bfdbfe'       },
  };
  const v = map[variant];
  return { padding: '1rem 1.25rem', background: v.bg, border: `1px solid ${v.border}`, marginBottom: '1.25rem' };
}
function sConfirmBtn(disabled: boolean): CSSProperties {
  return {
    flex: 1, padding: '1rem',
    background: disabled ? 'rgba(28,43,30,0.2)' : T.amber,
    color: disabled ? T.textMuted : T.green,
    border: 'none', fontSize: '0.82rem', letterSpacing: '0.18em',
    textTransform: 'uppercase', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  };
}


// ─── Static style objects ─────────────────────────────────────────────────────
const css: Record<string, CSSProperties> = {
  wrap: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    background: T.cream,
    border: `1px solid ${T.border}`,
    overflow: 'hidden',
  },
  topBar: {
    height: 3,
    background: `linear-gradient(90deg, ${T.amber}, ${T.greenMid})`,
  },
  body: { padding: '2.5rem' },
  pageTitle: {
    fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
    fontWeight: 400,
    color: T.green,
    letterSpacing: '-0.01em',
    marginBottom: '0.4rem',
    lineHeight: 1.1,
  },
  pageSub: {
    fontSize: '0.88rem',
    color: T.textMuted,
    letterSpacing: '0.06em',
    marginBottom: '2.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.72rem',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: T.amber,
    marginBottom: '0.85rem',
    fontFamily: "'DM Mono', monospace",
  },
  divider: { height: 1, background: T.border, margin: '2rem 0' },
  vaultLabel: {
    fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase',
    color: T.textMuted, fontFamily: "'DM Mono', monospace",
  },
  vaultValue: { fontSize: '1.3rem', fontWeight: 500, color: T.green, fontFamily: "'DM Mono', monospace" },
  typeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.25rem' },
  typeIcon: { fontSize: '2rem', marginBottom: '0.75rem', display: 'block' },
  typeTitle: { fontSize: '1.2rem', fontWeight: 600, color: T.green, marginBottom: '0.25rem' },
  typeDesc: { fontSize: '0.82rem', color: T.textMuted },
  locGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' },
  locIcon: { fontSize: '1.6rem', marginBottom: '0.4rem', display: 'block' },
  locName: { fontSize: '0.95rem', fontWeight: 600, color: T.green, marginBottom: '0.2rem' },
  locCoord: { fontSize: '0.7rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" },
  customPanel: { padding: '1.5rem', background: T.amberLight, border: `1px solid ${T.amberBorder}`, marginTop: '1rem' },
  customPanelTitle: {
    fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase',
    color: T.amber, marginBottom: '1rem', fontFamily: "'DM Mono', monospace",
  },
  coordGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  inputLabel: {
    display: 'block', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase',
    color: T.textMuted, marginBottom: '0.4rem', fontFamily: "'DM Mono', monospace",
  },
  selectedCoord: { fontSize: '0.82rem', color: T.textMuted, marginTop: '0.75rem' },
  selectedCoordVal: { fontFamily: "'DM Mono', monospace", fontWeight: 600, color: T.green },
  paramGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2.25rem' },
  paramField: {},
  payoutBar: {
    padding: '1.5rem 2rem', background: T.green,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem',
  },
  payoutLabel: {
    fontSize: '0.82rem', letterSpacing: '0.18em', textTransform: 'uppercase',
    color: 'rgba(244,237,224,0.6)', fontFamily: "'DM Mono', monospace",
  },
  payoutValue: { fontSize: '1.75rem', fontWeight: 400, color: '#f4ede0', fontFamily: "'Cormorant Garamond', Georgia, serif" },
  alertTitle: { fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' },
  alertBody:  { fontSize: '0.82rem', lineHeight: 1.6 },
  monoSmall:  { fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', wordBreak: 'break-all' },
  // Review step
  reviewCard: {
    padding: '1.75rem',
    background: T.white,
    border: `1px solid ${T.border}`,
    borderBottom: `3px solid ${T.amber}`,
    marginBottom: '1.5rem',
  },
  reviewRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.6rem 0', borderBottom: `1px solid ${T.border}`,
  },
  reviewRowLast: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.75rem 0 0',
  },
  reviewLabel: { fontSize: '0.88rem', color: T.textMuted },
  reviewValue: { fontFamily: "'DM Mono', monospace", fontSize: '0.95rem', color: T.green },
  reviewTotal: { fontSize: '1.4rem', fontWeight: 500, color: T.green },
  btnRow:   { display: 'flex', gap: '0.75rem' },
  cancelBtn: {
    flex: 1, padding: '1rem',
    background: 'transparent', color: T.green,
    border: `1.5px solid ${T.border}`,
    fontSize: '0.82rem', letterSpacing: '0.18em', textTransform: 'uppercase' as const,
    cursor: 'pointer', fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600,
  },
  // Loading / center states
  center: {
    padding: '5rem 2.5rem',
    textAlign: 'center' as const,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  spinnerRing: {
    width: 56, height: 56,
    border: `3px solid ${T.border}`,
    borderTopColor: T.amber,
    borderRadius: '50%',
    margin: '0 auto 2rem',
    animation: 'spin 0.9s linear infinite',
  },
  centerTitle: { fontSize: '1.75rem', fontWeight: 400, color: T.green, marginBottom: '0.5rem' },
  centerSub:   { fontSize: '0.9rem', color: T.textMuted, marginBottom: '1.5rem' },
  // Success
  successWrap: {
    padding: '5rem 2.5rem',
    textAlign: 'center' as const,
    background: T.successBg,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  successMark: { fontSize: '3.5rem', marginBottom: '1rem' },
  successTitle: { fontSize: '2.2rem', fontWeight: 400, color: T.successText, marginBottom: '0.5rem' },
  successSub:   { fontSize: '0.9rem', color: T.textMuted, marginBottom: '1rem' },
};

// ─── Types & Constants (unchanged) ───────────────────────────────────────────
type Step = 'form' | 'quote-loading' | 'review' | 'creating' | 'success';

type FormState = {
  type: OptionType;
  locationIdx: number;
  days: number;
  strike: number;
  spread: number;
  notional: string;
  isCustomLocation: boolean;
  customLat: string;
  customLon: string;
};

type AppState = {
  step: Step;
  requestId: string;
  error: string | null;
  txHash: string | null;
  debugInfo: string;
  simulationSuccess: boolean;
};

type Action =
  | { type: 'SET_STEP'; payload: Step }
  | { type: 'SET_REQUEST_ID'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TX_HASH'; payload: string | null }
  | { type: 'SET_DEBUG'; payload: string }
  | { type: 'SET_SIMULATION'; payload: boolean }
  | { type: 'RESET' };

const initialState: AppState = {
  step: 'form', requestId: '', error: null,
  txHash: null, debugInfo: '', simulationSuccess: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STEP':       return { ...state, step: action.payload };
    case 'SET_REQUEST_ID': return { ...state, requestId: action.payload };
    case 'SET_ERROR':      return { ...state, error: action.payload };
    case 'SET_TX_HASH':    return { ...state, txHash: action.payload };
    case 'SET_DEBUG':      return { ...state, debugInfo: action.payload };
    case 'SET_SIMULATION': return { ...state, simulationSuccess: action.payload };
    case 'RESET':          return { ...initialState, step: 'form' };
    default:               return state;
  }
}

const LOCATIONS = [
  { name: 'Medellín',      lat: '6.25',  lon: '-75.56', emoji: '🌸' },
  { name: 'London',        lat: '51.51', lon: '-0.13',  emoji: '☂️' },
  { name: 'Miami',         lat: '25.76', lon: '-80.19', emoji: '🌴' },
];

const TIME_BUFFER = 600;

const isValidLat = (lat: string) => { const n = Number(lat); return !isNaN(n) && n >= -90  && n <= 90;  };
const isValidLon = (lon: string) => { const n = Number(lon); return !isNaN(n) && n >= -180 && n <= 180; };

// ─── useQuote hook (logic unchanged) ─────────────────────────────────────────
function useQuote(
  form: FormState,
  address: `0x${string}` | undefined,
  publicClient: ReturnType<typeof usePublicClient>
) {
  const [requestId, setRequestId]           = useState<string>('');
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [txHash, setTxHash]                 = useState<string | null>(null);
  const [simulationResult, setSimulation]   = useState<{ success: boolean; error?: string } | null>(null);

  const { writeContract: requestQuote, data: quoteHash, error: quoteError, isPending: isQuotePending, reset: resetQuote } = useWriteContract();
  const { isSuccess: isQuoteSuccess, data: quoteReceipt, error: quoteReceiptError } = useWaitForTransactionReceipt({ hash: quoteHash });

  const { data: isFulfilled } = useReadContract({
    address: CONTRACTS.PREMIUM_CONSUMER,
    abi: PREMIUM_CONSUMER_ABI,
    functionName: 'isRequestFulfilled',
    args: requestId ? [requestId as `0x${string}`] : undefined,
    query: { enabled: !!requestId, refetchInterval: 3000 },
  });

  const { data: premium } = useReadContract({
    address: CONTRACTS.PREMIUM_CONSUMER,
    abi: PREMIUM_CONSUMER_ABI,
    functionName: 'premiumByRequest',
    args: requestId ? [requestId as `0x${string}`] : undefined,
    query: { enabled: !!requestId && isFulfilled === true },
  });

  useEffect(() => {
    if (isQuoteSuccess && quoteReceipt) {
      (async () => {
        for (const log of quoteReceipt.logs) {
          if (log.address.toLowerCase() === CONTRACTS.PREMIUM_CONSUMER.toLowerCase()) {
            if (log.topics && log.topics.length >= 2) {
              setRequestId(log.topics[1] as string);
              return;
            }
          }
        }
        setError('Request ID not found in logs.');
      })();
    }
  }, [isQuoteSuccess, quoteReceipt]);

  useEffect(() => { if (isQuotePending) setIsLoading(true); }, [isQuotePending]);
  useEffect(() => { if (quoteError) { setError(quoteError.message); setIsLoading(false); } }, [quoteError]);
  useEffect(() => { if (quoteReceiptError) { setError('Transaction reverted on-chain.'); setIsLoading(false); } }, [quoteReceiptError]);
  useEffect(() => { if (isFulfilled) setIsLoading(false); }, [isFulfilled]);

  const request = useCallback(async () => {
    if (!address || !publicClient) return;
    setError(null); setSimulation(null); setTxHash(null); setRequestId(''); resetQuote();
    try {
      const block     = await publicClient.getBlock({ blockTag: 'latest' });
      const blockTime = Number(block.timestamp);
      const startDate = blockTime + TIME_BUFFER;
      const expiryDate = startDate + form.days * 86400;
      const params: CreateOptionParams = {
        optionType: form.type,
        latitude:   form.isCustomLocation ? form.customLat : LOCATIONS[form.locationIdx].lat,
        longitude:  form.isCustomLocation ? form.customLon : LOCATIONS[form.locationIdx].lon,
        startDate:  BigInt(startDate),
        expiryDate: BigInt(expiryDate),
        strikeMM:   BigInt(form.strike),
        spreadMM:   BigInt(form.spread),
        notional:   parseEther(form.notional),
      };
      await publicClient.simulateContract({
        account: address, address: CONTRACTS.WEATHER_OPTION,
        abi: WEATHER_OPTION_ABI, functionName: 'requestPremiumQuote', args: [params],
      });
      setSimulation({ success: true });
      requestQuote({
        address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI,
        functionName: 'requestPremiumQuote', args: [params], gas: BigInt(2000000),
      }, {
        onSuccess: (hash) => setTxHash(hash),
        onError:   (err)  => setError(err.message),
      });
    } catch (err: unknown) {
      const e = err as { shortMessage?: string; message?: string };
      const message = e.shortMessage || e.message || 'Simulation failed';
      setError(message); setSimulation({ success: false, error: message });
    }
  }, [address, publicClient, form, requestQuote, resetQuote]);

  const reset = useCallback(() => {
    setRequestId(''); setError(null); setTxHash(null); setSimulation(null); resetQuote();
  }, [resetQuote]);

  return { request, isLoading, isFulfilled, premium, requestId, error, txHash, simulationResult, reset };
}

// ─── Small shared UI pieces ───────────────────────────────────────────────────
function Spinner({ color = T.amber }: { color?: string }) {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ ...css.spinnerRing, borderTopColor: color }} />
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span style={css.label}>{children}</span>;
}

function Divider() {
  return <div style={css.divider} />;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ImprovedCreateOptionFlow() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState<FormState>({
    type: OptionType.CALL,
    locationIdx: 0,
    days: 3,
    strike: 100,
    spread: 50,
    notional: '0.01',
    isCustomLocation: false,
    customLat: '',
    customLon: '',
  });

  const [state, dispatch] = useReducer(reducer, initialState);
  const quote = useQuote(form, address, publicClient);

  // ── Contract reads ──
  const { data: vaultLiquidity } = useReadContract({ address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'availableLiquidity', query: { enabled: mounted } });
  const { data: minNotional }    = useReadContract({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'minNotional',    query: { enabled: mounted } });
  const { data: minPremium }     = useReadContract({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'minPremium',     query: { enabled: mounted } });
  const { data: protocolFeeBps } = useReadContract({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'protocolFeeBps', query: { enabled: mounted } });

  // ── Derived values ──
  const maxPayout   = useMemo(() => parseEther(form.notional) * BigInt(form.spread), [form.notional, form.spread]);
  const protocolFee = useMemo(() => quote.premium && protocolFeeBps ? (quote.premium as bigint) * (protocolFeeBps as bigint) / BigInt(10000) : BigInt(0), [quote.premium, protocolFeeBps]);
  const totalCost   = useMemo(() => quote.premium ? (quote.premium as bigint) + protocolFee : BigInt(0), [quote.premium, protocolFee]);
  const isPremiumValid = useMemo(() => quote.premium !== undefined && minPremium !== undefined ? (quote.premium as bigint) >= (minPremium as bigint) : true, [quote.premium, minPremium]);

  // ── Write: create option ──
  const { writeContract: createOption, data: createHash, error: createError, isPending: isCreatePending } = useWriteContract();
  const { isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createHash });

  // ── State sync effects (logic unchanged) ──
  useEffect(() => {
    if (quote.isLoading)                                    dispatch({ type: 'SET_STEP', payload: 'quote-loading' });
    else if (quote.error)                                   { dispatch({ type: 'SET_ERROR', payload: quote.error }); dispatch({ type: 'SET_STEP', payload: 'form' }); }
    else if (quote.isFulfilled && quote.premium !== undefined) { dispatch({ type: 'SET_STEP', payload: 'review' }); dispatch({ type: 'SET_REQUEST_ID', payload: quote.requestId }); }
  }, [quote.isLoading, quote.error, quote.isFulfilled, quote.premium, quote.requestId]);

  useEffect(() => { dispatch({ type: 'SET_TX_HASH', payload: quote.txHash }); }, [quote.txHash]);
  useEffect(() => { if (quote.simulationResult) dispatch({ type: 'SET_SIMULATION', payload: quote.simulationResult.success }); }, [quote.simulationResult]);
  useEffect(() => { if (isCreatePending) dispatch({ type: 'SET_STEP', payload: 'creating' }); }, [isCreatePending]);
  useEffect(() => { if (createError && state.step === 'creating') { dispatch({ type: 'SET_ERROR', payload: createError.message }); dispatch({ type: 'SET_STEP', payload: 'review' }); } }, [createError, state.step]);

  const hasTriggeredSuccess = useRef(false);
  useEffect(() => {
    if (isCreateSuccess && !hasTriggeredSuccess.current) {
      hasTriggeredSuccess.current = true;
      dispatch({ type: 'SET_STEP', payload: 'success' });
      const timer = setTimeout(() => {
        dispatch({ type: 'RESET' });
        quote.reset();
        setForm({ type: OptionType.CALL, locationIdx: 0, days: 3, strike: 100, spread: 50, notional: '0.01', isCustomLocation: false, customLat: '', customLon: '' });
        hasTriggeredSuccess.current = false;
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isCreateSuccess, quote]);

  useEffect(() => setMounted(true), []);

  // ── Handlers ──
  const handleRequestQuote = useCallback(() => {
    if (form.isCustomLocation) {
      if (!form.customLat || !form.customLon) { dispatch({ type: 'SET_ERROR', payload: 'Please enter both latitude and longitude.' }); return; }
      if (!isValidLat(form.customLat) || !isValidLon(form.customLon)) { dispatch({ type: 'SET_ERROR', payload: 'Invalid coordinates. Latitude: −90–90, Longitude: −180–180.' }); return; }
    }
    dispatch({ type: 'SET_ERROR', payload: null });
    quote.request();
  }, [quote, form]);

  const handleCreateOption = useCallback(() => {
    if (!quote.requestId || !totalCost) return;
    createOption({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'createOptionWithQuote', args: [quote.requestId as `0x${string}`], value: totalCost });
  }, [quote.requestId, totalCost, createOption]);

  const handleCancelQuote = useCallback(() => { quote.reset(); dispatch({ type: 'SET_STEP', payload: 'form' }); }, [quote]);

  const hasEnoughLiquidity = vaultLiquidity && maxPayout <= (vaultLiquidity as bigint);

  const handleNumberChange = (field: 'days' | 'strike' | 'spread') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number(e.target.value);
    setForm(prev => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  if (!mounted) return null;

  // ── Not connected ──
  if (!isConnected) {
    return (
      <div style={{ ...css.wrap, padding: '5rem 2.5rem', textAlign: 'center' }}>
        <div style={css.topBar} />
        <div style={{ padding: '4rem 2rem', fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🌦</div>
          <h2 style={{ ...css.pageTitle, marginBottom: '0.75rem' }}>Weather Options</h2>
          <p style={css.pageSub}>Connect your wallet to start protecting against rainfall risk.</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FORM STEP
  // ─────────────────────────────────────────────────────────────────────────────
  if (state.step === 'form' || state.step === 'quote-loading') {
    const selectedCoord = form.isCustomLocation
      ? form.customLat && form.customLon ? `${form.customLat}°, ${form.customLon}°` : '—'
      : `${LOCATIONS[form.locationIdx].lat}°, ${LOCATIONS[form.locationIdx].lon}°`;

    return (
      <div style={css.wrap}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } input:focus { border-color: ${T.amber} !important; }`}</style>
        <div style={css.topBar} />

        {state.step === 'quote-loading' ? (
          // ── Loading overlay ──
          <div style={css.center}>
            <Spinner />
            <h2 style={css.centerTitle}>Calculating your premium</h2>
            <p style={css.centerSub}>Chainlink is analysing historical rainfall data for your coordinates.</p>

            {quote.requestId ? (
              <div style={sAlertBox('success')}>
                <p style={{ ...css.alertTitle, color: T.successText }}>Request ID confirmed</p>
                <p style={{ ...css.monoSmall, color: T.successText }}>{quote.requestId}</p>
              </div>
            ) : state.txHash ? (
              <div style={sAlertBox('info')}>
                <p style={{ ...css.alertTitle, color: '#1e3a5f' }}>Transaction submitted</p>
                <a href={`https://sepolia.etherscan.io/tx/${state.txHash}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.78rem', color: T.amber, fontFamily: "'DM Mono', monospace" }}>
                  View on Etherscan →
                </a>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: T.textMuted }}>Waiting for confirmation…</p>
            )}

            <button onClick={handleCancelQuote}
              style={{ marginTop: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>
              Cancel
            </button>
          </div>
        ) : (
          // ── Form body ──
          <div style={css.body}>
            <h2 style={css.pageTitle}>Create weather protection</h2>
            <p style={css.pageSub}>Configure your option parameters below</p>

            {/* Vault liquidity */}
            {vaultLiquidity && (
              <div style={sVaultBanner(!!hasEnoughLiquidity)}>
                <div>
                  <span style={css.vaultLabel}>Vault available liquidity</span>
                  <div style={css.vaultValue}>{formatEther(vaultLiquidity as bigint)} ETH</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={css.vaultLabel}>Your option needs</span>
                  <div style={{ ...css.vaultValue, color: hasEnoughLiquidity ? T.successText : T.errorText }}>
                    {formatEther(maxPayout)} ETH
                  </div>
                </div>
                {!hasEnoughLiquidity && (
                  <p style={{ width: '100%', fontSize: '0.78rem', color: T.errorText, fontFamily: "'DM Mono', monospace" }}>
                    Insufficient liquidity — reduce notional or spread.
                  </p>
                )}
              </div>
            )}

            {/* Option type */}
            <SectionLabel>Protection type</SectionLabel>
            <div style={css.typeGrid}>
              {([
                { t: OptionType.CALL, icon: '🌧', title: 'Call',  desc: 'Payout when rainfall exceeds strike',     accent: T.green },
                { t: OptionType.PUT,  icon: '☀️', title: 'Put',   desc: 'Payout when rainfall falls below strike', accent: T.amber },
              ] as const).map(({ t, icon, title, desc, accent }) => (
                <button key={t} onClick={() => setForm({ ...form, type: t })} style={sTypeCard(form.type === t, accent)}>
                  <span style={css.typeIcon}>{icon}</span>
                  <div style={css.typeTitle}>{title}</div>
                  <div style={css.typeDesc}>{desc}</div>
                </button>
              ))}
            </div>

            <Divider />

            {/* Location */}
            <SectionLabel>Location</SectionLabel>
            <div style={css.locGrid}>
              {LOCATIONS.map((loc, idx) => (
                <button key={idx} onClick={() => setForm({ ...form, locationIdx: idx, isCustomLocation: false })} style={sLocCard(!form.isCustomLocation && form.locationIdx === idx)}>
                  <span style={css.locIcon}>{loc.emoji}</span>
                  <div style={css.locName}>{loc.name}</div>
                  <div style={css.locCoord}>{loc.lat}°, {loc.lon}°</div>
                </button>
              ))}
              {/* Custom location */}
              <button onClick={() => setForm({ ...form, isCustomLocation: true })} style={sLocCard(form.isCustomLocation)}>
                <span style={css.locIcon}>📍</span>
                <div style={css.locName}>Custom</div>
                <div style={css.locCoord}>Enter coordinates</div>
              </button>
            </div>

            {form.isCustomLocation && (
              <div style={css.customPanel}>
                <p style={css.customPanelTitle}>Manual coordinates</p>
                <div style={css.coordGrid}>
                  <div>
                    <label style={css.inputLabel}>Latitude (−90 to 90)</label>
                    <input value={form.customLat} onChange={(e) => setForm({ ...form, customLat: e.target.value })}
                      placeholder="e.g. 6.25" style={sInput(!!form.customLat && !isValidLat(form.customLat))} />
                  </div>
                  <div>
                    <label style={css.inputLabel}>Longitude (−180 to 180)</label>
                    <input value={form.customLon} onChange={(e) => setForm({ ...form, customLon: e.target.value })}
                      placeholder="e.g. −75.56" style={sInput(!!form.customLon && !isValidLon(form.customLon))} />
                  </div>
                </div>
              </div>
            )}

            <p style={css.selectedCoord}>
              Selected:{' '}
              <span style={css.selectedCoordVal}>{selectedCoord}</span>
            </p>

            <Divider />

            {/* Parameters */}
            <SectionLabel>Option parameters</SectionLabel>
            <div style={css.paramGrid}>
              {([
                { field: 'days'   as const, label: 'Duration (days)', type: 'number', min: 1,  max: 30 },
                { field: 'strike' as const, label: 'Strike (mm)',      type: 'number' },
                { field: 'spread' as const, label: 'Spread (mm)',      type: 'number' },
              ]).map(({ field, label, type, min, max }) => (
                <div key={field} style={css.paramField}>
                  <label style={css.inputLabel}>{label}</label>
                  <input type={type} min={min} max={max} value={form[field]}
                    onChange={handleNumberChange(field)} style={sInput()} />
                </div>
              ))}
              <div style={css.paramField}>
                <label style={css.inputLabel}>Notional (ETH / mm)</label>
                <input type="text" value={form.notional}
                  onChange={(e) => setForm({ ...form, notional: e.target.value })} style={sInput()} />
              </div>
            </div>

            {/* Max payout bar */}
            <div style={css.payoutBar}>
              <span style={css.payoutLabel}>Maximum payout</span>
              <span style={css.payoutValue}>{formatEther(maxPayout)} ETH</span>
            </div>

            {/* Alerts */}
            {state.error && (
              <div style={sAlertBox('error')}>
                <p style={{ ...css.alertTitle, color: T.errorText }}>Error</p>
                <p style={{ ...css.alertBody, color: T.errorText }}>{state.error}</p>
                {state.txHash && (
                  <a href={`https://sepolia.etherscan.io/tx/${state.txHash}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.75rem', color: T.amber, display: 'block', marginTop: '0.5rem', fontFamily: "'DM Mono', monospace" }}>
                    View on Etherscan →
                  </a>
                )}
              </div>
            )}

            {state.simulationSuccess && (
              <div style={sAlertBox('success')}>
                <p style={{ ...css.alertTitle, color: T.successText }}>Pre-flight check passed</p>
                <p style={{ ...css.alertBody, color: T.successText }}>Simulation successful — confirm in your wallet.</p>
              </div>
            )}

            {/* CTA */}
            <button onClick={handleRequestQuote} disabled={quote.isLoading || !hasEnoughLiquidity} style={sPrimaryBtn(quote.isLoading || !hasEnoughLiquidity)}>
              {quote.isLoading ? 'Requesting quote…' : 'Get weather quote →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REVIEW STEP
  // ─────────────────────────────────────────────────────────────────────────────
  if (state.step === 'review' && quote.premium !== undefined) {
    const zeroPremiumMsg = (quote.premium as bigint) === BigInt(0)
      ? form.type === OptionType.CALL ? 'Strike above forecast (out of the money)' : 'Strike below forecast (out of the money)'
      : null;

    return (
      <div style={css.wrap}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={css.topBar} />
        <div style={css.body}>
          <h2 style={css.pageTitle}>Review your option</h2>
          <p style={css.pageSub}>Confirm the terms before paying the premium</p>

          <SectionLabel>Premium breakdown</SectionLabel>
          <div style={css.reviewCard}>
            <div style={css.reviewRow}>
              <span style={css.reviewLabel}>Premium</span>
              <span style={css.reviewValue}>
                {formatEther(quote.premium as bigint)} ETH
                {zeroPremiumMsg && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: T.warnText }}>({zeroPremiumMsg})</span>
                )}
              </span>
            </div>
            <div style={css.reviewRow}>
              <span style={css.reviewLabel}>Protocol fee (1%)</span>
              <span style={css.reviewValue}>{formatEther(protocolFee)} ETH</span>
            </div>
            <div style={css.reviewRowLast}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: T.green }}>Total to pay</span>
              <span style={css.reviewTotal}>{formatEther(totalCost)} ETH</span>
            </div>
          </div>

          <SectionLabel>Option terms</SectionLabel>
          <div style={{ ...css.reviewCard, borderBottom: `3px solid ${T.greenMid}` }}>
            {([
              ['Type',       form.type === OptionType.CALL ? 'Call — excess rain' : 'Put — drought'],
              ['Location',   form.isCustomLocation ? `${form.customLat}°, ${form.customLon}°` : `${LOCATIONS[form.locationIdx].name} (${LOCATIONS[form.locationIdx].lat}°, ${LOCATIONS[form.locationIdx].lon}°)`],
              ['Duration',   `${form.days} days`],
              ['Strike',     `${form.strike} mm`],
              ['Spread',     `${form.spread} mm`],
              ['Notional',   `${form.notional} ETH/mm`],
              ['Max payout', `${formatEther(maxPayout)} ETH`],
            ] as [string, string][]).map(([k, v], i, arr) => (
              <div key={k} style={i < arr.length - 1 ? css.reviewRow : css.reviewRowLast}>
                <span style={css.reviewLabel}>{k}</span>
                <span style={css.reviewValue}>{v}</span>
              </div>
            ))}
          </div>

          {!isPremiumValid && (
            <div style={{ ...sAlertBox('warn'), marginBottom: '1.25rem' }}>
              <p style={{ ...css.alertTitle, color: T.warnText }}>Premium below minimum</p>
              <p style={{ ...css.alertBody, color: T.warnText }}>
                Minimum required: {minPremium ? formatEther(minPremium as bigint) : '?'} ETH. Adjust your parameters to proceed.
              </p>
            </div>
          )}

          {createError && (
            <div style={sAlertBox('error')}>
              <p style={{ ...css.alertTitle, color: T.errorText }}>Transaction failed</p>
              <p style={{ ...css.alertBody, color: T.errorText }}>{createError.message}</p>
            </div>
          )}

          <div style={css.btnRow}>
            <button onClick={handleCancelQuote} style={css.cancelBtn}>← Back</button>
            <button onClick={handleCreateOption} disabled={isCreatePending || !isPremiumValid} style={sConfirmBtn(isCreatePending || !isPremiumValid)}>
              {isCreatePending ? 'Confirming…' : 'Confirm & pay →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATING
  // ─────────────────────────────────────────────────────────────────────────────
  if (state.step === 'creating') {
    return (
      <div style={css.wrap}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={css.topBar} />
        <div style={css.center}>
          <Spinner color={T.green} />
          <h2 style={css.centerTitle}>Creating your option</h2>
          <p style={css.centerSub}>Confirm the transaction in your wallet and wait for on-chain confirmation.</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUCCESS
  // ─────────────────────────────────────────────────────────────────────────────
  if (state.step === 'success') {
    return (
      <div style={css.wrap}>
        <div style={css.topBar} />
        <div style={css.successWrap}>
          <div style={css.successMark}>🌿</div>
          <h2 style={css.successTitle}>Option created</h2>
          <p style={css.successSub}>Your weather protection is now live on-chain.</p>
          {createHash && (
            <p style={{ ...css.monoSmall, color: T.textMuted, marginBottom: '1rem' }}>
              {createHash.slice(0, 10)}…{createHash.slice(-8)}
            </p>
          )}
          <p style={{ fontSize: '0.78rem', color: T.textMuted, letterSpacing: '0.1em' }}>
            Returning to form in a moment…
          </p>
        </div>
      </div>
    );
  }

  return null;
}