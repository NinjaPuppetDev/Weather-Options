'use client';

import { useState, useEffect, useReducer, useCallback, useMemo, useRef, CSSProperties, ReactNode, ChangeEvent } from 'react';
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
import { parseContractError, ParsedContractError } from '../lib/contractErrors';

// ─── Design tokens ─────────────────────────────────────────────────────────
const T = {
  cream:       '#f4ede0',
  green:       '#1c2b1e',
  greenMid:    '#2d4a30',
  greenMuted:  '#4a5c4b',
  amber:       '#c9913d',
  amberLight:  'rgba(201,145,61,0.10)',
  amberBorder: 'rgba(201,145,61,0.25)',
  border:      'rgba(28,43,30,0.12)',
  borderHover: 'rgba(28,43,30,0.28)',
  text:        '#1c2b1e',
  textMuted:   '#6b6560',
  white:       '#ffffff',
  errorBg:     '#fef2f0',
  errorBorder: '#e8b4ad',
  errorText:   '#7c2d12',
  successBg:   '#f0f7f1',
  successBorder:'#a8c9ac',
  successText: '#14532d',
  warnBg:      '#fdfaee',
  warnBorder:  '#e8d5a3',
  warnText:    '#78350f',
};

const RESPONSIVE = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dropIn {
    from { opacity: 0; transform: translateY(-8px) scaleY(0.96); }
    to   { opacity: 1; transform: translateY(0) scaleY(1); }
  }
  input:focus { border-color: ${T.amber} !important; }

  .cof-body { padding: 2.5rem; }
  .cof-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2.25rem; }
  .cof-loc-grid  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem; }
  .cof-coord-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .cof-param-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 2.25rem; }
  .cof-payout-bar { padding: 1.5rem 2rem; background: ${T.green}; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .cof-vault-banner { padding: 1.25rem 1.5rem; margin-bottom: 2.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; }
  .cof-review-row { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid ${T.border}; }
  .cof-review-row-last { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0 0; }
  .cof-btn-row { display: flex; gap: 0.75rem; }
  .cof-error-banner { animation: fadeSlideIn 0.2s ease; }

  /* City lookup */
  .city-lookup-panel { animation: dropIn 0.18s ease; }
  .city-lookup-list { max-height: 220px; overflow-y: auto; border: 1px solid ${T.border}; background: ${T.white}; margin-top: 0.5rem; }
  .city-lookup-item:hover { background: ${T.amberLight} !important; }
  .city-add-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 0.5rem; align-items: end; margin-top: 0.75rem; }

  @media (max-width: 640px) {
    .cof-body { padding: 1.25rem; }
    .cof-type-grid { grid-template-columns: 1fr; }
    .cof-loc-grid  { grid-template-columns: 1fr 1fr; }
    .cof-coord-grid { grid-template-columns: 1fr; }
    .cof-param-grid { grid-template-columns: 1fr; }
    .cof-payout-bar { flex-direction: column; align-items: flex-start; gap: 0.5rem; padding: 1.25rem; }
    .cof-vault-banner { flex-direction: column; align-items: flex-start; }
    .cof-review-row { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
    .cof-review-row-last { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
    .cof-btn-row { flex-direction: column; }
    .city-add-row { grid-template-columns: 1fr 1fr; }
  }
`;

// ─── Style helpers ──────────────────────────────────────────────────────────
function sVaultBanner(ok: boolean): CSSProperties {
  return {
    background: ok ? T.successBg : T.errorBg,
    border: `1px solid ${ok ? T.successBorder : T.errorBorder}`,
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

const css: Record<string, CSSProperties> = {
  wrap:         { fontFamily: "'Cormorant Garamond', Georgia, serif", background: T.cream, border: `1px solid ${T.border}`, overflow: 'hidden' },
  topBar:       { height: 3, background: `linear-gradient(90deg, ${T.amber}, ${T.greenMid})` },
  pageTitle:    { fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 400, color: T.green, letterSpacing: '-0.01em', marginBottom: '0.4rem', lineHeight: 1.1 },
  pageSub:      { fontSize: '0.88rem', color: T.textMuted, letterSpacing: '0.06em', marginBottom: '2.5rem' },
  label:        { display: 'block', fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, marginBottom: '0.85rem', fontFamily: "'DM Mono', monospace" },
  divider:      { height: 1, background: T.border, margin: '2rem 0' },
  vaultLabel:   { fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace" },
  vaultValue:   { fontSize: '1.3rem', fontWeight: 500, color: T.green, fontFamily: "'DM Mono', monospace" },
  typeIcon:     { fontSize: '2rem', marginBottom: '0.75rem', display: 'block' },
  typeTitle:    { fontSize: '1.2rem', fontWeight: 600, color: T.green, marginBottom: '0.25rem' },
  typeDesc:     { fontSize: '0.82rem', color: T.textMuted },
  locIcon:      { fontSize: '1.6rem', marginBottom: '0.4rem', display: 'block' },
  locName:      { fontSize: '0.95rem', fontWeight: 600, color: T.green, marginBottom: '0.2rem' },
  locCoord:     { fontSize: '0.7rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" },
  customPanel:  { padding: '1.5rem', background: T.amberLight, border: `1px solid ${T.amberBorder}`, marginTop: '1rem' },
  customPanelTitle: { fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: T.amber, marginBottom: '1rem', fontFamily: "'DM Mono', monospace" },
  inputLabel:   { display: 'block', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: T.textMuted, marginBottom: '0.4rem', fontFamily: "'DM Mono', monospace" },
  selectedCoord:    { fontSize: '0.82rem', color: T.textMuted, marginTop: '0.75rem' },
  selectedCoordVal: { fontFamily: "'DM Mono', monospace", fontWeight: 600, color: T.green },
  paramField:   {},
  payoutLabel:  { fontSize: '0.82rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(244,237,224,0.6)', fontFamily: "'DM Mono', monospace" },
  payoutValue:  { fontSize: '1.75rem', fontWeight: 400, color: '#f4ede0', fontFamily: "'Cormorant Garamond', Georgia, serif" },
  monoSmall:    { fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', wordBreak: 'break-all' },
  reviewCard:   { padding: '1.75rem', background: T.white, border: `1px solid ${T.border}`, borderBottom: `3px solid ${T.amber}`, marginBottom: '1.5rem' },
  reviewLabel:  { fontSize: '0.88rem', color: T.textMuted },
  reviewValue:  { fontFamily: "'DM Mono', monospace", fontSize: '0.95rem', color: T.green },
  reviewTotal:  { fontSize: '1.4rem', fontWeight: 500, color: T.green },
  cancelBtn:    { flex: 1, padding: '1rem', background: 'transparent', color: T.green, border: `1.5px solid ${T.border}`, fontSize: '0.82rem', letterSpacing: '0.18em', textTransform: 'uppercase' as const, cursor: 'pointer', fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 },
  center:       { padding: '5rem 2.5rem', textAlign: 'center' as const, fontFamily: "'Cormorant Garamond', Georgia, serif" },
  spinnerRing:  { width: 56, height: 56, border: `3px solid ${T.border}`, borderTopColor: T.amber, borderRadius: '50%', margin: '0 auto 2rem', animation: 'spin 0.9s linear infinite' },
  centerTitle:  { fontSize: '1.75rem', fontWeight: 400, color: T.green, marginBottom: '0.5rem' },
  centerSub:    { fontSize: '0.9rem', color: T.textMuted, marginBottom: '1.5rem' },
  successWrap:  { padding: '5rem 2.5rem', textAlign: 'center' as const, background: T.successBg, fontFamily: "'Cormorant Garamond', Georgia, serif" },
  successMark:  { fontSize: '3.5rem', marginBottom: '1rem' },
  successTitle: { fontSize: '2.2rem', fontWeight: 400, color: T.successText, marginBottom: '0.5rem' },
  successSub:   { fontSize: '0.9rem', color: T.textMuted, marginBottom: '1rem' },
};

// ─── ErrorBanner component ──────────────────────────────────────────────────
function ErrorBanner({
  error,
  onDismiss,
  style,
}: {
  error: ParsedContractError;
  onDismiss?: () => void;
  style?: CSSProperties;
}) {
  const isCancelled = error.errorName === 'UserRejected';
  const bg     = isCancelled ? T.warnBg     : T.errorBg;
  const border = isCancelled ? T.warnBorder : T.errorBorder;
  const color  = isCancelled ? T.warnText   : T.errorText;

  return (
    <div
      className="cof-error-banner"
      style={{
        padding: '0.875rem 1rem',
        background: bg,
        border: `1px solid ${border}`,
        marginBottom: '1.25rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
        ...style,
      }}
    >
      <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.05rem' }}>
        {isCancelled ? '⚠️' : '✕'}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color, fontFamily: "'DM Mono', monospace", marginBottom: '0.2rem' }}>
          {error.title}
        </div>
        <div style={{ fontSize: '0.82rem', color, lineHeight: 1.55 }}>
          {error.detail}
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color, fontSize: '1rem', padding: 0, flexShrink: 0, lineHeight: 1 }}
          aria-label="Dismiss"
        >×</button>
      )}
    </div>
  );
}

// ─── InfoBox (non-error notices) ────────────────────────────────────────────
function InfoBox({ variant, title, children }: { variant: 'success' | 'warn' | 'info'; title: string; children: ReactNode }) {
  const map = {
    success: { bg: T.successBg, border: T.successBorder, color: T.successText },
    warn:    { bg: T.warnBg,    border: T.warnBorder,    color: T.warnText    },
    info:    { bg: '#eff6ff',   border: '#bfdbfe',        color: '#1e3a5f'     },
  };
  const v = map[variant];
  return (
    <div style={{ padding: '1rem 1.25rem', background: v.bg, border: `1px solid ${v.border}`, marginBottom: '1.25rem' }}>
      {title && <p style={{ fontSize: '0.82rem', fontWeight: 700, color: v.color, marginBottom: '0.35rem' }}>{title}</p>}
      <div style={{ fontSize: '0.82rem', color: v.color, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────
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
  /** Parsed error for the quote-request phase */
  quoteError: ParsedContractError | null;
  /** Parsed error for the create-option phase */
  createError: ParsedContractError | null;
  txHash: string | null;
  simulationSuccess: boolean;
};

type Action =
  | { type: 'SET_STEP';         payload: Step }
  | { type: 'SET_REQUEST_ID';   payload: string }
  | { type: 'SET_QUOTE_ERROR';  payload: ParsedContractError | null }
  | { type: 'SET_CREATE_ERROR'; payload: ParsedContractError | null }
  | { type: 'SET_TX_HASH';      payload: string | null }
  | { type: 'SET_SIMULATION';   payload: boolean }
  | { type: 'RESET' };

const initialState: AppState = {
  step: 'form', requestId: '',
  quoteError: null, createError: null,
  txHash: null, simulationSuccess: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STEP':         return { ...state, step: action.payload };
    case 'SET_REQUEST_ID':   return { ...state, requestId: action.payload };
    case 'SET_QUOTE_ERROR':  return { ...state, quoteError: action.payload };
    case 'SET_CREATE_ERROR': return { ...state, createError: action.payload };
    case 'SET_TX_HASH':      return { ...state, txHash: action.payload };
    case 'SET_SIMULATION':   return { ...state, simulationSuccess: action.payload };
    case 'RESET':            return { ...initialState };
    default:                 return state;
  }
}

// ─── Locations ──────────────────────────────────────────────────────────────
type CityEntry = { name: string; lat: string; lon: string; emoji: string };

const DEFAULT_LOCATIONS: CityEntry[] = [
  { name: 'Medellín', lat: '6.25',   lon: '-75.56',  emoji: '🌸' },
  { name: 'London',   lat: '51.51',  lon: '-0.13',   emoji: '☂️' },
  { name: 'Miami',    lat: '25.76',  lon: '-80.19',  emoji: '🌴' },
];

/** Extended built-in city directory used for the lookup panel */
const CITY_DIRECTORY: CityEntry[] = [
  { name: 'Amsterdam',      lat: '52.37',  lon: '4.90',    emoji: '🚲' },
  { name: 'Bangkok',        lat: '13.75',  lon: '100.52',  emoji: '🛕' },
  { name: 'Barcelona',      lat: '41.39',  lon: '2.17',    emoji: '🏖' },
  { name: 'Beijing',        lat: '39.91',  lon: '116.39',  emoji: '🏯' },
  { name: 'Berlin',         lat: '52.52',  lon: '13.41',   emoji: '🐻' },
  { name: 'Buenos Aires',   lat: '-34.60', lon: '-58.38',  emoji: '🥩' },
  { name: 'Cairo',          lat: '30.04',  lon: '31.24',   emoji: '🏜' },
  { name: 'Cape Town',      lat: '-33.92', lon: '18.42',   emoji: '🦁' },
  { name: 'Chicago',        lat: '41.88',  lon: '-87.63',  emoji: '🌬' },
  { name: 'Dubai',          lat: '25.20',  lon: '55.27',   emoji: '🏙' },
  { name: 'Hong Kong',      lat: '22.32',  lon: '114.17',  emoji: '🌃' },
  { name: 'Istanbul',       lat: '41.01',  lon: '28.95',   emoji: '🕌' },
  { name: 'Jakarta',        lat: '-6.21',  lon: '106.85',  emoji: '🌧' },
  { name: 'Johannesburg',   lat: '-26.20', lon: '28.04',   emoji: '💎' },
  { name: 'Lagos',          lat: '6.46',   lon: '3.38',    emoji: '🌊' },
  { name: 'Lima',           lat: '-12.05', lon: '-77.04',  emoji: '🦙' },
  { name: 'Lisbon',         lat: '38.72',  lon: '-9.14',   emoji: '🐟' },
  { name: 'London',         lat: '51.51',  lon: '-0.13',   emoji: '☂️' },
  { name: 'Los Angeles',    lat: '34.05',  lon: '-118.24', emoji: '🎬' },
  { name: 'Madrid',         lat: '40.42',  lon: '-3.70',   emoji: '🐂' },
  { name: 'Manila',         lat: '14.60',  lon: '120.98',  emoji: '🌺' },
  { name: 'Medellín',       lat: '6.25',   lon: '-75.56',  emoji: '🌸' },
  { name: 'Melbourne',      lat: '-37.81', lon: '144.96',  emoji: '🏉' },
  { name: 'Mexico City',    lat: '19.43',  lon: '-99.13',  emoji: '🌮' },
  { name: 'Miami',          lat: '25.76',  lon: '-80.19',  emoji: '🌴' },
  { name: 'Milan',          lat: '45.46',  lon: '9.19',    emoji: '👗' },
  { name: 'Mumbai',         lat: '19.08',  lon: '72.88',   emoji: '🎭' },
  { name: 'Nairobi',        lat: '-1.29',  lon: '36.82',   emoji: '🦒' },
  { name: 'New York',       lat: '40.71',  lon: '-74.01',  emoji: '🗽' },
  { name: 'Oslo',           lat: '59.91',  lon: '10.75',   emoji: '🦌' },
  { name: 'Paris',          lat: '48.86',  lon: '2.35',    emoji: '🗼' },
  { name: 'Rio de Janeiro', lat: '-22.91', lon: '-43.17',  emoji: '🏖' },
  { name: 'Rome',           lat: '41.90',  lon: '12.50',   emoji: '🏛' },
  { name: 'Santiago',       lat: '-33.46', lon: '-70.65',  emoji: '🍷' },
  { name: 'São Paulo',      lat: '-23.55', lon: '-46.63',  emoji: '🌆' },
  { name: 'Seoul',          lat: '37.57',  lon: '126.98',  emoji: '🏮' },
  { name: 'Shanghai',       lat: '31.23',  lon: '121.47',  emoji: '🌉' },
  { name: 'Singapore',      lat: '1.35',   lon: '103.82',  emoji: '🦁' },
  { name: 'Stockholm',      lat: '59.33',  lon: '18.07',   emoji: '🫙' },
  { name: 'Sydney',         lat: '-33.87', lon: '151.21',  emoji: '🦘' },
  { name: 'Taipei',         lat: '25.03',  lon: '121.57',  emoji: '🫧' },
  { name: 'Tehran',         lat: '35.69',  lon: '51.39',   emoji: '🕍' },
  { name: 'Tokyo',          lat: '35.68',  lon: '139.69',  emoji: '⛩' },
  { name: 'Toronto',        lat: '43.65',  lon: '-79.38',  emoji: '🍁' },
  { name: 'Vienna',         lat: '48.21',  lon: '16.37',   emoji: '🎻' },
  { name: 'Warsaw',         lat: '52.23',  lon: '21.01',   emoji: '🦅' },
  { name: 'Zurich',         lat: '47.38',  lon: '8.54',    emoji: '⛰' },
];

const LOCATIONS = DEFAULT_LOCATIONS;

const TIME_BUFFER  = 600;
const isValidLat   = (lat: string) => { const n = Number(lat); return !isNaN(n) && n >= -90  && n <= 90;  };
const isValidLon   = (lon: string) => { const n = Number(lon); return !isNaN(n) && n >= -180 && n <= 180; };

// ─── CityLookup component ───────────────────────────────────────────────────
function CityLookup({
  userCities,
  onSelect,
  onAddCity,
}: {
  userCities: CityEntry[];
  onSelect: (city: CityEntry) => void;
  onAddCity: (city: CityEntry) => void;
}) {
  const [query, setQuery]       = useState('');
  const [newName, setNewName]   = useState('');
  const [newLat, setNewLat]     = useState('');
  const [newLon, setNewLon]     = useState('');
  const [addError, setAddError] = useState('');

  const allCities = useMemo(() => {
    // Merge user cities on top, deduplicate by name (user takes precedence)
    const map = new Map<string, CityEntry>();
    [...CITY_DIRECTORY].forEach(c => map.set(c.name.toLowerCase(), c));
    [...userCities].forEach(c => map.set(c.name.toLowerCase(), c));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [userCities]);

  const filtered = useMemo(() =>
    query.trim()
      ? allCities.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
      : allCities,
    [allCities, query]
  );

  const handleAddCity = () => {
    setAddError('');
    if (!newName.trim()) { setAddError('City name is required.'); return; }
    if (!isValidLat(newLat)) { setAddError('Latitude must be between −90 and 90.'); return; }
    if (!isValidLon(newLon)) { setAddError('Longitude must be between −180 and 180.'); return; }
    onAddCity({ name: newName.trim(), lat: newLat.trim(), lon: newLon.trim(), emoji: '📍' });
    setNewName(''); setNewLat(''); setNewLon('');
  };

  const googleMapsUrl = (lat: string, lon: string) =>
    `https://www.google.com/maps?q=${lat},${lon}`;

  return (
    <div className="city-lookup-panel" style={{ padding: '1.5rem', background: T.amberLight, border: `1px solid ${T.amberBorder}`, marginTop: '1rem' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <span style={{ fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: T.amber, fontFamily: "'DM Mono', monospace" }}>
          City directory
        </span>
        <span style={{ fontSize: '0.7rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>
          {allCities.length} cities
        </span>
      </div>

      {/* Search */}
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search city…"
        style={{ ...sInput(), marginBottom: 0 }}
      />

      {/* City list */}
      <div className="city-lookup-list">
        {filtered.length === 0 ? (
          <div style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>
            No cities found.
          </div>
        ) : filtered.map((city, i) => (
          <div
            key={i}
            className="city-lookup-item"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.6rem 0.9rem',
              borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onClick={() => onSelect(city)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1rem' }}>{city.emoji}</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: T.green, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  {city.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>
                  {city.lat}°, {city.lon}°
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {/* Google Maps link */}
              <a
                href={googleMapsUrl(city.lat, city.lon)}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Maps"
                onClick={e => e.stopPropagation()}
                style={{
                  fontSize: '0.68rem', color: T.amber, fontFamily: "'DM Mono', monospace",
                  textDecoration: 'none', padding: '0.2rem 0.45rem',
                  border: `1px solid ${T.amberBorder}`, lineHeight: 1.4,
                  transition: 'background 0.15s',
                }}
              >
                map ↗
              </a>
              {/* Select button */}
              <button
                onClick={e => { e.stopPropagation(); onSelect(city); }}
                style={{
                  fontSize: '0.68rem', padding: '0.2rem 0.55rem',
                  background: T.green, color: T.cream,
                  border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace",
                  letterSpacing: '0.1em', lineHeight: 1.4,
                }}
              >
                use
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: T.amberBorder, margin: '1rem 0 0.85rem' }} />

      {/* Add custom city */}
      <p style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: '0.6rem' }}>
        Add a city
      </p>

      {addError && (
        <p style={{ fontSize: '0.75rem', color: T.errorText, fontFamily: "'DM Mono', monospace", marginBottom: '0.5rem' }}>
          ⚠ {addError}
        </p>
      )}

      <div className="city-add-row">
        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: T.textMuted, marginBottom: '0.35rem', fontFamily: "'DM Mono', monospace" }}>Name</label>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Bogotá" style={sInput()} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: T.textMuted, marginBottom: '0.35rem', fontFamily: "'DM Mono', monospace" }}>Lat</label>
          <input value={newLat} onChange={e => setNewLat(e.target.value)} placeholder="4.71" style={sInput(!!newLat && !isValidLat(newLat))} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: T.textMuted, marginBottom: '0.35rem', fontFamily: "'DM Mono', monospace" }}>Lon</label>
          <input value={newLon} onChange={e => setNewLon(e.target.value)} placeholder="-74.07" style={sInput(!!newLon && !isValidLon(newLon))} />
        </div>
        <button
          onClick={handleAddCity}
          style={{
            padding: '0.65rem 1rem',
            background: T.amber, color: T.green,
            border: 'none', cursor: 'pointer',
            fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const,
            fontWeight: 700, fontFamily: "'DM Mono', monospace",
            alignSelf: 'flex-end',
            whiteSpace: 'nowrap',
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

// ─── useQuote hook ──────────────────────────────────────────────────────────
function useQuote(
  form: FormState,
  address: `0x${string}` | undefined,
  publicClient: ReturnType<typeof usePublicClient>
) {
  const [requestId, setRequestId]         = useState<string>('');
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState<ParsedContractError | null>(null);
  const [txHash, setTxHash]               = useState<string | null>(null);
  const [simulationResult, setSimulation] = useState<{ success: boolean } | null>(null);

  const { writeContract: requestQuote, data: quoteHash, error: quoteWagmiError, isPending: isQuotePending, reset: resetQuote } = useWriteContract();
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

  // Extract request ID from receipt logs
  useEffect(() => {
    if (isQuoteSuccess && quoteReceipt) {
      for (const log of quoteReceipt.logs) {
        if (log.address.toLowerCase() === CONTRACTS.PREMIUM_CONSUMER.toLowerCase()) {
          if (log.topics && log.topics.length >= 2) {
            setRequestId(log.topics[1] as string);
            return;
          }
        }
      }
      setError({ title: 'Request ID not found', detail: 'The transaction succeeded but the request ID could not be extracted from the logs. Please try again.', errorName: null });
    }
  }, [isQuoteSuccess, quoteReceipt]);

  useEffect(() => { if (isQuotePending) setIsLoading(true); }, [isQuotePending]);

  useEffect(() => {
    if (quoteWagmiError) {
      setError(parseContractError(quoteWagmiError));
      setIsLoading(false);
    }
  }, [quoteWagmiError]);

  useEffect(() => {
    if (quoteReceiptError) {
      setError(parseContractError(quoteReceiptError));
      setIsLoading(false);
    }
  }, [quoteReceiptError]);

  useEffect(() => { if (isFulfilled) setIsLoading(false); }, [isFulfilled]);

  const request = useCallback(async () => {
    if (!address || !publicClient) return;
    setError(null); setSimulation(null); setTxHash(null); setRequestId(''); resetQuote();

    try {
      const block      = await publicClient.getBlock({ blockTag: 'latest' });
      const blockTime  = Number(block.timestamp);
      const startDate  = blockTime + TIME_BUFFER;
      const expiryDate = startDate + form.days * 86400;

      const params: CreateOptionParams = {
        optionType:  form.type,
        latitude:    form.isCustomLocation ? form.customLat : LOCATIONS[form.locationIdx].lat,
        longitude:   form.isCustomLocation ? form.customLon : LOCATIONS[form.locationIdx].lon,
        startDate:   BigInt(startDate),
        expiryDate:  BigInt(expiryDate),
        strikeMM:    BigInt(form.strike),
        spreadMM:    BigInt(form.spread),
        notional:    parseEther(form.notional),
      };

      // Simulate first so errors surface before wallet prompt
      await publicClient.simulateContract({
        account: address, address: CONTRACTS.WEATHER_OPTION,
        abi: WEATHER_OPTION_ABI, functionName: 'requestPremiumQuote', args: [params],
      });

      setSimulation({ success: true });

      requestQuote(
        {
          address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI,
          functionName: 'requestPremiumQuote', args: [params], gas: BigInt(2000000),
        },
        {
          onSuccess: (hash) => setTxHash(hash),
          onError:   (err)  => { setError(parseContractError(err)); setIsLoading(false); },
        }
      );
    } catch (err: unknown) {
      setError(parseContractError(err));
      setSimulation({ success: false });
      setIsLoading(false);
    }
  }, [address, publicClient, form, requestQuote, resetQuote]);

  const reset = useCallback(() => {
    setRequestId(''); setError(null); setTxHash(null); setSimulation(null); resetQuote();
  }, [resetQuote]);

  return { request, isLoading, isFulfilled, premium, requestId, error, txHash, simulationResult, reset };
}

// ─── Minor components ───────────────────────────────────────────────────────
function Spinner({ color = T.amber }: { color?: string }) {
  return <div style={{ ...css.spinnerRing, borderTopColor: color }} />;
}
function SectionLabel({ children }: { children: ReactNode }) {
  return <span style={css.label}>{children}</span>;
}
function Divider() {
  return <div style={css.divider} />;
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function CreateOptionFlow() {
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

  // User-added cities (persisted in component lifetime; could be lifted to localStorage if desired)
  const [userCities, setUserCities] = useState<CityEntry[]>([]);
  // Whether the city lookup panel is open
  const [showCityLookup, setShowCityLookup] = useState(false);

  const [state, dispatch] = useReducer(reducer, initialState);
  const quote = useQuote(form, address, publicClient);

  const { data: vaultLiquidity } = useReadContract({ address: CONTRACTS.VAULT, abi: VAULT_ABI, functionName: 'availableLiquidity', query: { enabled: mounted } });
  const { data: minNotional }    = useReadContract({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'minNotional',    query: { enabled: mounted } });
  const { data: minPremium }     = useReadContract({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'minPremium',     query: { enabled: mounted } });
  const { data: protocolFeeBps } = useReadContract({ address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI, functionName: 'protocolFeeBps', query: { enabled: mounted } });

  const maxPayout   = useMemo(() => parseEther(form.notional) * BigInt(form.spread), [form.notional, form.spread]);
  const protocolFee = useMemo(() => quote.premium && protocolFeeBps ? (quote.premium as bigint) * (protocolFeeBps as bigint) / BigInt(10000) : BigInt(0), [quote.premium, protocolFeeBps]);
  const totalCost   = useMemo(() => quote.premium ? (quote.premium as bigint) + protocolFee : BigInt(0), [quote.premium, protocolFee]);
  const isPremiumValid = useMemo(() =>
    quote.premium !== undefined && minPremium !== undefined
      ? (quote.premium as bigint) >= (minPremium as bigint)
      : true,
    [quote.premium, minPremium]
  );
  const isPremiumZero = quote.premium !== undefined && (quote.premium as bigint) === BigInt(0);

  const { writeContract: createOption, data: createHash, error: createWagmiError, isPending: isCreatePending } = useWriteContract();
  const { isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createHash });

  // ── Sync quote state into reducer ──────────────────────────────────────
  useEffect(() => {
    if (quote.isLoading) {
      dispatch({ type: 'SET_STEP',        payload: 'quote-loading' });
      dispatch({ type: 'SET_QUOTE_ERROR', payload: null });
    } else if (quote.error) {
      dispatch({ type: 'SET_QUOTE_ERROR', payload: quote.error });
      dispatch({ type: 'SET_STEP',        payload: 'form' });
    } else if (quote.isFulfilled && quote.premium !== undefined) {
      dispatch({ type: 'SET_STEP',       payload: 'review' });
      dispatch({ type: 'SET_REQUEST_ID', payload: quote.requestId });
    }
  }, [quote.isLoading, quote.error, quote.isFulfilled, quote.premium, quote.requestId]);

  useEffect(() => { dispatch({ type: 'SET_TX_HASH',    payload: quote.txHash }); }, [quote.txHash]);
  useEffect(() => { if (quote.simulationResult) dispatch({ type: 'SET_SIMULATION', payload: quote.simulationResult.success }); }, [quote.simulationResult]);
  useEffect(() => { if (isCreatePending) dispatch({ type: 'SET_STEP', payload: 'creating' }); }, [isCreatePending]);

  useEffect(() => {
    if (createWagmiError && state.step === 'creating') {
      dispatch({ type: 'SET_CREATE_ERROR', payload: parseContractError(createWagmiError) });
      dispatch({ type: 'SET_STEP',         payload: 'review' });
    }
  }, [createWagmiError, state.step]);

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

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleRequestQuote = useCallback(() => {
    if (form.isCustomLocation) {
      if (!form.customLat || !form.customLon) {
        dispatch({ type: 'SET_QUOTE_ERROR', payload: { title: 'Missing coordinates', detail: 'Please enter both latitude and longitude for your custom location.', errorName: null } });
        return;
      }
      if (!isValidLat(form.customLat) || !isValidLon(form.customLon)) {
        dispatch({ type: 'SET_QUOTE_ERROR', payload: { title: 'Invalid coordinates', detail: 'Latitude must be between −90 and 90. Longitude must be between −180 and 180.', errorName: null } });
        return;
      }
    }
    dispatch({ type: 'SET_QUOTE_ERROR', payload: null });
    quote.request();
  }, [quote, form]);

  const handleCreateOption = useCallback(() => {
    if (!quote.requestId || !totalCost) return;
    dispatch({ type: 'SET_CREATE_ERROR', payload: null });
    createOption(
      {
        address: CONTRACTS.WEATHER_OPTION, abi: WEATHER_OPTION_ABI,
        functionName: 'createOptionWithQuote',
        args: [quote.requestId as `0x${string}`],
        value: totalCost,
      },
      {
        onError: (err) => {
          dispatch({ type: 'SET_CREATE_ERROR', payload: parseContractError(err) });
          dispatch({ type: 'SET_STEP',         payload: 'review' });
        },
      }
    );
  }, [quote.requestId, totalCost, createOption]);

  const handleCancelQuote = useCallback(() => {
    quote.reset();
    dispatch({ type: 'SET_STEP', payload: 'form' });
  }, [quote]);

  /** Pick a random city from the full directory */
  const handleRandomize = useCallback(() => {
    const pool = [...CITY_DIRECTORY, ...userCities];
    const city = pool[Math.floor(Math.random() * pool.length)];
    setForm(prev => ({
      ...prev,
      isCustomLocation: true,
      customLat: city.lat,
      customLon: city.lon,
    }));
    setShowCityLookup(false);
  }, [userCities]);

  /** Select a city from the lookup */
  const handleCitySelect = useCallback((city: CityEntry) => {
    setForm(prev => ({
      ...prev,
      isCustomLocation: true,
      customLat: city.lat,
      customLon: city.lon,
    }));
    setShowCityLookup(false);
  }, []);

  /** Add a new user city */
  const handleAddUserCity = useCallback((city: CityEntry) => {
    setUserCities(prev => {
      const exists = prev.some(c => c.name.toLowerCase() === city.name.toLowerCase());
      return exists ? prev : [...prev, city];
    });
  }, []);

  const hasEnoughLiquidity = vaultLiquidity && maxPayout <= (vaultLiquidity as bigint);

  const handleNumberChange = (field: 'days' | 'strike' | 'spread') => (e: ChangeEvent<HTMLInputElement>) => {
    const num = Number(e.target.value);
    setForm(prev => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  if (!mounted) return null;

  // ── Disconnected ─────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div style={{ ...css.wrap, padding: '5rem 2.5rem', textAlign: 'center' }}>
        <style>{RESPONSIVE}</style>
        <div style={css.topBar} />
        <div style={{ padding: '4rem 2rem', fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🌦</div>
          <h2 style={{ ...css.pageTitle, marginBottom: '0.75rem' }}>Bruma Protocol</h2>
          <p style={css.pageSub}>Connect your wallet to start protecting against rainfall risk.</p>
        </div>
      </div>
    );
  }

  // ── Quote loading ────────────────────────────────────────────────────────
  if (state.step === 'quote-loading') {
    return (
      <div style={css.wrap}>
        <style>{RESPONSIVE}</style>
        <div style={css.topBar} />
        <div style={css.center}>
          <Spinner />
          <h2 style={css.centerTitle}>Calculating your premium</h2>
          <p style={css.centerSub}>Chainlink is analysing historical rainfall data for your coordinates.</p>
          {quote.requestId ? (
            <InfoBox variant="success" title="Request ID confirmed">
              <span style={css.monoSmall}>{quote.requestId}</span>
            </InfoBox>
          ) : state.txHash ? (
            <InfoBox variant="info" title="Transaction submitted">
              <a href={`https://sepolia.etherscan.io/tx/${state.txHash}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.78rem', color: T.amber, fontFamily: "'DM Mono', monospace" }}>
                View on Etherscan →
              </a>
            </InfoBox>
          ) : (
            <p style={{ fontSize: '0.85rem', color: T.textMuted }}>Waiting for confirmation…</p>
          )}
          <button onClick={handleCancelQuote}
            style={{ marginTop: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────
  if (state.step === 'form') {
    const selectedCoord = form.isCustomLocation
      ? form.customLat && form.customLon ? `${form.customLat}°, ${form.customLon}°` : '—'
      : `${LOCATIONS[form.locationIdx].lat}°, ${LOCATIONS[form.locationIdx].lon}°`;

    // Warn proactively if duration is very short (likely to hit PremiumBelowMinimum)
    const showShortDurationWarning = form.days < 3;

    // Resolved minimum premium string — always a string, never unknown
    const minPremiumStr: string = minPremium ? formatEther(minPremium as bigint) : '0.05';

    return (
      <div style={css.wrap}>
        <style>{RESPONSIVE}</style>
        <div style={css.topBar} />
        <div className="cof-body">
          <h2 style={css.pageTitle}>Create weather protection</h2>
          <p style={css.pageSub}>Configure your option parameters below</p>

          {vaultLiquidity && (
            <div className="cof-vault-banner" style={sVaultBanner(!!hasEnoughLiquidity)}>
              <div>
                <span style={css.vaultLabel}>Vault available liquidity</span>
                <div style={css.vaultValue}>{formatEther(vaultLiquidity as bigint)} ETH</div>
              </div>
              <div>
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

          <SectionLabel>Protection type</SectionLabel>
          <div className="cof-type-grid">
            {([
              { t: OptionType.CALL, icon: '🌧', title: 'Call', desc: 'Payout when rainfall exceeds strike',     accent: T.green },
              { t: OptionType.PUT,  icon: '☀️', title: 'Put',  desc: 'Payout when rainfall falls below strike', accent: T.amber },
            ] as const).map(({ t, icon, title, desc, accent }) => (
              <button key={t} onClick={() => setForm({ ...form, type: t })} style={sTypeCard(form.type === t, accent)}>
                <span style={css.typeIcon}>{icon}</span>
                <div style={css.typeTitle}>{title}</div>
                <div style={css.typeDesc}>{desc}</div>
              </button>
            ))}
          </div>

          <Divider />

          {/* ── Location section ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <SectionLabel>Location</SectionLabel>
            {/* Action buttons: Randomize + City lookup toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <button
                onClick={handleRandomize}
                title="Pick a random city"
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.7rem', letterSpacing: '0.15em',
                  textTransform: 'uppercase', fontFamily: "'DM Mono', monospace",
                  background: 'transparent', color: T.textMuted,
                  border: `1px solid ${T.border}`, cursor: 'pointer',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
              >
                🎲 Random
              </button>
              <button
                onClick={() => setShowCityLookup(v => !v)}
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.7rem', letterSpacing: '0.15em',
                  textTransform: 'uppercase', fontFamily: "'DM Mono', monospace",
                  background: showCityLookup ? T.amber : 'transparent',
                  color: showCityLookup ? T.green : T.amber,
                  border: `1px solid ${showCityLookup ? T.amber : T.amberBorder}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                🔍 City lookup
              </button>
            </div>
          </div>

          <div className="cof-loc-grid">
            {LOCATIONS.map((loc, idx) => (
              <button key={idx} onClick={() => setForm({ ...form, locationIdx: idx, isCustomLocation: false })} style={sLocCard(!form.isCustomLocation && form.locationIdx === idx)}>
                <span style={css.locIcon}>{loc.emoji}</span>
                <div style={css.locName}>{loc.name}</div>
                <div style={css.locCoord}>{loc.lat}°, {loc.lon}°</div>
              </button>
            ))}
            <button onClick={() => setForm({ ...form, isCustomLocation: true })} style={sLocCard(form.isCustomLocation)}>
              <span style={css.locIcon}>📍</span>
              <div style={css.locName}>Custom</div>
              <div style={css.locCoord}>Enter coordinates</div>
            </button>
          </div>

          {/* City lookup panel */}
          {showCityLookup && (
            <CityLookup
              userCities={userCities}
              onSelect={handleCitySelect}
              onAddCity={handleAddUserCity}
            />
          )}

          {/* Manual coordinate inputs (shown when custom is selected) */}
          {form.isCustomLocation && !showCityLookup && (
            <div style={css.customPanel}>
              <p style={css.customPanelTitle}>Manual coordinates</p>
              <div className="cof-coord-grid">
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
            Selected: <span style={css.selectedCoordVal}>{selectedCoord}</span>
            {form.isCustomLocation && form.customLat && form.customLon && (
              <a
                href={`https://www.google.com/maps?q=${form.customLat},${form.customLon}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: '0.75rem', fontSize: '0.72rem', color: T.amber, fontFamily: "'DM Mono', monospace", textDecoration: 'none' }}
              >
                view on map ↗
              </a>
            )}
          </p>

          <Divider />

          <SectionLabel>Option parameters</SectionLabel>
          <div className="cof-param-grid">
            {([
              { field: 'days'   as const, label: 'Duration (days)', min: 1, max: 30 },
              { field: 'strike' as const, label: 'Strike (mm)' },
              { field: 'spread' as const, label: 'Spread (mm)' },
            ]).map(({ field, label, min, max }) => (
              <div key={field} style={css.paramField}>
                <label style={css.inputLabel}>{label}</label>
                <input
                  type="number" min={min} max={max} value={form[field]}
                  onChange={handleNumberChange(field)}
                  style={sInput(field === 'days' && showShortDurationWarning)}
                />
              </div>
            ))}
            <div style={css.paramField}>
              <label style={css.inputLabel}>Notional (ETH / mm)</label>
              <input
                type="text" value={form.notional}
                onChange={(e) => setForm({ ...form, notional: e.target.value })}
                style={sInput()}
              />
            </div>
          </div>

          {/* ── FIX: extract minPremiumStr as a typed string before JSX ── */}
          {showShortDurationWarning && (
            <InfoBox variant="warn" title="Short duration">
              {`Options under 3 days often produce a premium below the protocol minimum of ${minPremiumStr} ETH and will be rejected. Consider a longer coverage period.`}
            </InfoBox>
          )}

          {/* Proactive small-notional warning */}
          {minNotional && parseEther(form.notional || '0') < (minNotional as bigint) && (
            <InfoBox variant="warn" title="Notional too small">
              Minimum notional is {formatEther(minNotional as bigint)} ETH/mm.
              Please increase the notional amount.
            </InfoBox>
          )}

          <div className="cof-payout-bar">
            <span style={css.payoutLabel}>Maximum payout</span>
            <span style={css.payoutValue}>{formatEther(maxPayout)} ETH</span>
          </div>

          {/* Quote-phase error */}
          {state.quoteError && (
            <ErrorBanner
              error={state.quoteError}
              onDismiss={() => dispatch({ type: 'SET_QUOTE_ERROR', payload: null })}
            />
          )}

          {/* Pre-flight check passed notice */}
          {state.simulationSuccess && !state.quoteError && (
            <InfoBox variant="success" title="Pre-flight check passed">
              Simulation successful — confirm in your wallet.
            </InfoBox>
          )}

          <button
            onClick={handleRequestQuote}
            disabled={quote.isLoading || !hasEnoughLiquidity || showShortDurationWarning}
            style={sPrimaryBtn(quote.isLoading || !hasEnoughLiquidity || showShortDurationWarning)}
          >
            {quote.isLoading ? 'Requesting quote…' : 'Get weather quote →'}
          </button>
        </div>
      </div>
    );
  }

  // ── Review ───────────────────────────────────────────────────────────────
  if (state.step === 'review' && quote.premium !== undefined) {
    return (
      <div style={css.wrap}>
        <style>{RESPONSIVE}</style>
        <div style={css.topBar} />
        <div className="cof-body">
          <h2 style={css.pageTitle}>Review your option</h2>
          <p style={css.pageSub}>Confirm the terms before paying the premium</p>

          <SectionLabel>Premium breakdown</SectionLabel>
          <div style={css.reviewCard}>
            <div className="cof-review-row">
              <span style={css.reviewLabel}>Premium</span>
              <span style={css.reviewValue}>{formatEther(quote.premium as bigint)} ETH</span>
            </div>
            <div className="cof-review-row">
              <span style={css.reviewLabel}>Protocol fee (1%)</span>
              <span style={css.reviewValue}>{formatEther(protocolFee)} ETH</span>
            </div>
            <div className="cof-review-row-last">
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
              <div key={k} className={i < arr.length - 1 ? 'cof-review-row' : 'cof-review-row-last'}>
                <span style={css.reviewLabel}>{k}</span>
                <span style={css.reviewValue}>{v}</span>
              </div>
            ))}
          </div>

          {/* Zero-premium warning — oracle returned 0 */}
          {isPremiumZero && (
            <ErrorBanner
              error={{
                title: 'Zero premium returned',
                detail: form.type === OptionType.CALL
                  ? 'The oracle returned a premium of zero — your strike is likely above the forecast rainfall (deeply out of the money). Try a lower strike or a shorter spread.'
                  : 'The oracle returned a premium of zero — your strike is likely below the forecast rainfall (deeply out of the money). Try a higher strike or a shorter spread.',
                errorName: 'InvalidPremium',
              }}
            />
          )}

          {/* Below-minimum warning */}
          {!isPremiumZero && !isPremiumValid && (
            <ErrorBanner
              error={{
                title: 'Premium below minimum',
                detail: `The calculated premium (${formatEther(quote.premium as bigint)} ETH) is below the protocol minimum of ${minPremium ? formatEther(minPremium as bigint) : '0.05'} ETH. Try a longer duration (at least 3–5 days) or a larger notional.`,
                errorName: 'PremiumBelowMinimum',
              }}
            />
          )}

          {/* Create-phase error */}
          {state.createError && (
            <ErrorBanner
              error={state.createError}
              onDismiss={() => dispatch({ type: 'SET_CREATE_ERROR', payload: null })}
            />
          )}

          <div className="cof-btn-row">
            <button onClick={handleCancelQuote} style={css.cancelBtn}>← Back</button>
            <button
              onClick={handleCreateOption}
              disabled={isCreatePending || !isPremiumValid}
              style={sConfirmBtn(isCreatePending || !isPremiumValid)}
            >
              {isCreatePending ? 'Confirming…' : 'Confirm & pay →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Creating ─────────────────────────────────────────────────────────────
  if (state.step === 'creating') {
    return (
      <div style={css.wrap}>
        <style>{RESPONSIVE}</style>
        <div style={css.topBar} />
        <div style={css.center}>
          <Spinner color={T.green} />
          <h2 style={css.centerTitle}>Creating your option</h2>
          <p style={css.centerSub}>Confirm the transaction in your wallet and wait for on-chain confirmation.</p>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (state.step === 'success') {
    return (
      <div style={css.wrap}>
        <style>{RESPONSIVE}</style>
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