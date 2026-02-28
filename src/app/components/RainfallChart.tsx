'use client';

import { useState, useEffect, useMemo, CSSProperties } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer, Cell,
} from 'recharts';

// ─── Design tokens (Bruma palette) ───────────────────────────────────────────
const T = {
  cream:        '#f4ede0',
  green:        '#1c2b1e',
  greenMid:     '#2d4a30',
  greenBar:     '#3a6640',
  muted:        '#4a5c4b',
  textMuted:    '#6b6560',
  amber:        '#c9913d',
  amberLight:   'rgba(201,145,61,0.10)',
  amberBorder:  'rgba(201,145,61,0.25)',
  amberBar:     '#c9913d',
  amberBarDeep: '#a06520',
  teal:         '#1a6b5e',
  tealLight:    'rgba(26,107,94,0.10)',
  tealBorder:   'rgba(26,107,94,0.22)',
  tealBar:      '#1a6b5e',
  tealBarDeep:  '#0d4a40',
  border:       'rgba(28,43,30,0.11)',
  white:        '#ffffff',
  successText:  '#14532d',
  warnText:     '#78350f',
  errorText:    '#7c2d12',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface WindowDatum {
  date:     string;   // formatted label "Jan '24"
  rawDate:  string;   // YYYY-MM-DD (for tooltip)
  rainfall: number;   // mm total over the window
}

interface ChartStats {
  avg:          number;
  max:          number;
  min:          number;
  breachPct:    number;
  breachCount:  number;
  totalWindows: number;
}

export interface RainfallChartProps {
  latitude:  string;
  longitude: string;
  strike:    number;
  spread:    number;
  days:      number;
  isCall:    boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SKELETON_HEIGHTS = [38, 55, 42, 71, 88, 62, 45, 59, 77, 93, 66, 48, 55, 80,
  70, 52, 44, 67, 83, 57, 40, 73, 90, 63, 47, 60, 78, 51, 43, 68,
  85, 56, 41, 74, 87, 61, 49, 58, 76, 53];

function fmtAxisDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

function fmtTooltipDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function getDateRange(): { start: string; end: string } {
  const now   = new Date();
  const end   = new Date(now);
  end.setDate(end.getDate() - 1);
  const start = new Date(now);
  start.setFullYear(start.getFullYear() - 2);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function buildWindows(
  dates: string[],
  precip: (number | null)[],
  windowDays: number,
): WindowDatum[] {
  const windows: WindowDatum[] = [];
  const effectiveStep = windowDays; // non-overlapping
  for (let i = 0; i + windowDays <= precip.length; i += effectiveStep) {
    const slice   = precip.slice(i, i + windowDays);
    const total   = slice.reduce((acc: number, v) => acc + (v ?? 0), 0);
    windows.push({
      rawDate:  dates[i],
      date:     fmtAxisDate(dates[i]),
      rainfall: Math.round(total * 10) / 10,
    });
  }
  return windows;
}

function sampleForDisplay(windows: WindowDatum[], maxBars = 130): WindowDatum[] {
  if (windows.length <= maxBars) return windows;
  const step = Math.ceil(windows.length / maxBars);
  return windows.filter((_, i) => i % step === 0);
}

function computeStats(
  windows: WindowDatum[],
  strike: number,
  isCall: boolean,
): ChartStats {
  if (!windows.length) return { avg: 0, max: 0, min: 0, breachPct: 0, breachCount: 0, totalWindows: 0 };
  const vals        = windows.map(w => w.rainfall);
  const avg         = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const max         = Math.round(Math.max(...vals));
  const min         = Math.round(Math.min(...vals));
  const breachCount = isCall
    ? vals.filter(v => v > strike).length
    : vals.filter(v => v < strike).length;
  const breachPct   = Math.round((breachCount / vals.length) * 100);
  return { avg, max, min, breachPct, breachCount, totalWindows: windows.length };
}

function getBarColor(rainfall: number, strike: number, spread: number, isCall: boolean): string {
  if (isCall) {
    if (rainfall > strike + spread) return T.amberBarDeep;
    if (rainfall > strike)          return T.amberBar;
    return T.greenBar;
  } else {
    if (rainfall < Math.max(0, strike - spread)) return T.tealBarDeep;
    if (rainfall < strike)                        return T.tealBar;
    return T.greenBar;
  }
}

function breachColorFor(pct: number): string {
  if (pct >= 40) return '#b84a2a';
  if (pct >= 20) return T.amber;
  return T.muted;
}

function breachQualLabel(pct: number): string {
  if (pct >= 40) return 'high';
  if (pct >= 20) return 'moderate';
  return 'low';
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 44px 28px 44px' }}>
      {SKELETON_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="rc-skel"
          style={{
            flex: 1, background: T.border, height: `${h}%`,
            animationDelay: `${(i % 8) * 0.07}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WindowDatum; value: number }> }) {
  if (!active || !payload?.length) return null;
  const d   = payload[0].payload;
  const val = payload[0].value;
  return (
    <div style={{ background: T.green, padding: '0.55rem 0.9rem', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
      <div style={{ fontSize: '0.6rem', color: 'rgba(244,237,224,0.45)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.14em', marginBottom: '0.25rem' }}>
        {fmtTooltipDate(d.rawDate)}
      </div>
      <div style={{ fontSize: '1.05rem', color: T.cream, fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}>
        {val} <span style={{ fontSize: '0.72rem', color: 'rgba(244,237,224,0.55)', fontFamily: "'DM Mono', monospace" }}>mm</span>
      </div>
    </div>
  );
}

// ─── StatCell ─────────────────────────────────────────────────────────────────
function StatCell({ label, value, sub, valueColor }: { label: string; value: string; sub?: string; valueColor?: string }) {
  return (
    <div style={{ padding: '1rem 1.5rem', background: T.cream, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <span style={{ fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
        {label}
      </span>
      <span className="rc-stat-val" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.5rem)', color: valueColor ?? T.green, fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, lineHeight: 1 }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: '0.62rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>{sub}</span>
      )}
    </div>
  );
}

// ─── RainfallChart ────────────────────────────────────────────────────────────
export default function RainfallChart({
  latitude, longitude, strike, spread, days, isCall,
}: RainfallChartProps) {
  // ── Raw daily data — refetched only when location changes ──────────────────
  const [rawData, setRawData]   = useState<{ dates: string[]; precip: (number | null)[] } | null>(null);
  const [loading, setLoading]   = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  const hasCoords = useMemo(() => {
    const lat = parseFloat(latitude), lon = parseFloat(longitude);
    return !isNaN(lat) && lat >= -90 && lat <= 90 && !isNaN(lon) && lon >= -180 && lon <= 180;
  }, [latitude, longitude]);

  useEffect(() => {
    if (!hasCoords) { setRawData(null); return; }
    const lat = parseFloat(latitude), lon = parseFloat(longitude);
    const ctrl = new AbortController();
    const { start, end } = getDateRange();

    setLoading(true);
    setFetchErr(null);
    setLocationName(`${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&daily=precipitation_sum&timezone=UTC`;

    fetch(url, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => {
        setRawData({ dates: json.daily.time, precip: json.daily.precipitation_sum });
        setLoading(false);
      })
      .catch(e => {
        if (e.name !== 'AbortError') {
          setFetchErr('Could not load historical rainfall. Check network settings.');
          setLoading(false);
        }
      });

    return () => ctrl.abort();
  }, [latitude, longitude, hasCoords]);

  // ── Reprocess windows when days changes (instant, no fetch) ───────────────
  const allWindows = useMemo(() => {
    if (!rawData) return [];
    return buildWindows(rawData.dates, rawData.precip, Math.max(days, 1));
  }, [rawData, days]);

  const displayWindows = useMemo(() => sampleForDisplay(allWindows), [allWindows]);
  const stats          = useMemo(() => computeStats(allWindows, strike, isCall), [allWindows, strike, isCall]);

  // ── Y-axis domain — always shows strike+spread band ──────────────────────
  const yMax = useMemo(() => {
    const dataMax = displayWindows.length ? Math.max(...displayWindows.map(w => w.rainfall)) : 0;
    const bandTop = isCall ? strike + spread : strike;
    return Math.ceil(Math.max(dataMax, bandTop) * 1.12);
  }, [displayWindows, strike, spread, isCall]);

  // ── Payout band bounds ────────────────────────────────────────────────────
  const bandY1 = isCall ? strike : Math.max(0, strike - spread);
  const bandY2 = isCall ? strike + spread : strike;

  // ── X-axis tick interval ──────────────────────────────────────────────────
  const tickInterval = useMemo(() =>
    Math.max(Math.floor(displayWindows.length / 7), 1),
    [displayWindows]
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const wrapStyle: CSSProperties = {
    background: T.cream,
    border: `1px solid ${T.border}`,
    overflow: 'hidden',
    marginBottom: '2.25rem',
  };

  if (!hasCoords) {
    return (
      <div style={wrapStyle}>
        <div style={{ padding: '2.5rem', textAlign: 'center', color: T.textMuted, fontFamily: "'DM Mono', monospace", fontSize: '0.82rem' }}>
          Enter coordinates to see historical rainfall context.
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.75rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', borderBottom: `1px solid ${T.border}` }}>
        <div>
          <span style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: T.amber, fontFamily: "'DM Mono', monospace", display: 'block', marginBottom: '0.2rem' }}>
            Historical rainfall
          </span>
          <h4 style={{ fontSize: '1rem', fontWeight: 500, color: T.green, margin: 0, fontFamily: "'Cormorant Garamond', serif" }}>
            {days}-day cumulative windows · {locationName}
          </h4>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Strike legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: 20, height: 2, background: T.amber }} />
            <span style={{ fontSize: '0.62rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>Strike {strike}mm</span>
          </div>
          {/* Payout band legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: 14, height: 10, background: isCall ? T.amberLight : T.tealLight, border: `1px solid ${isCall ? T.amberBorder : T.tealBorder}` }} />
            <span style={{ fontSize: '0.62rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>
              {isCall ? `Payout band +${spread}mm` : `Payout band −${spread}mm`}
            </span>
          </div>
          <span style={{ fontSize: '0.6rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", opacity: 0.7 }}>
            {loading ? 'Loading…' : rawData ? 'Last 2 yrs' : ''}
          </span>
        </div>
      </div>

      {/* Chart area */}
      <div style={{ background: T.white, paddingTop: '1.25rem', paddingBottom: '0.5rem' }}>
        {loading ? (
          <ChartSkeleton />
        ) : fetchErr ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: T.errorText, fontFamily: "'DM Mono', monospace", marginBottom: '0.35rem' }}>{fetchErr}</div>
              <div style={{ fontSize: '0.7rem', color: T.textMuted, fontFamily: "'DM Mono', monospace" }}>Strike and spread lines still reflect your parameters.</div>
            </div>
          </div>
        ) : displayWindows.length > 0 ? (
          <div className="rc-chart">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={displayWindows}
                margin={{ top: 8, right: 20, left: 0, bottom: 4 }}
                barCategoryGap="12%"
              >
                <CartesianGrid vertical={false} stroke={T.border} strokeDasharray="0" />

                {/* Payout band */}
                <ReferenceArea
                  y1={bandY1}
                  y2={bandY2}
                  fill={isCall ? T.amberLight : T.tealLight}
                  stroke={isCall ? T.amberBorder : T.tealBorder}
                  strokeWidth={1}
                />

                {/* Strike line */}
                <ReferenceLine
                  y={strike}
                  stroke={T.amber}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  label={{
                    value: `${strike}mm`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: T.amber,
                    fontFamily: "'DM Mono', monospace",
                    dy: -4,
                  }}
                />

                <XAxis
                  dataKey="date"
                  interval={tickInterval}
                  tick={{ fontSize: 9.5, fontFamily: "'DM Mono', monospace", fill: T.textMuted }}
                  tickLine={false}
                  axisLine={{ stroke: T.border }}
                />

                <YAxis
                  domain={[0, yMax]}
                  tick={{ fontSize: 9.5, fontFamily: "'DM Mono', monospace", fill: T.textMuted }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}`}
                  width={36}
                  tickCount={5}
                />

                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(28,43,30,0.04)' }} />

                <Bar dataKey="rainfall" maxBarSize={18} radius={[1, 1, 0, 0]}>
                  {displayWindows.map((d, i) => (
                    <Cell
                      key={i}
                      fill={getBarColor(d.rainfall, strike, spread, isCall)}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>

      {/* Stat strip */}
      {!loading && !fetchErr && allWindows.length > 0 && (
        <div className="rc-stat-grid">
          <StatCell
            label={isCall ? 'Breach prob.' : 'Drought prob.'}
            value={`${stats.breachPct}%`}
            sub={`${breachQualLabel(stats.breachPct)} · ${stats.breachCount} of ${stats.totalWindows} windows`}
            valueColor={breachColorFor(stats.breachPct)}
          />
          <StatCell
            label="Avg rainfall"
            value={`${stats.avg}mm`}
            sub={`per ${days}-day window`}
          />
          <StatCell
            label="Peak window"
            value={`${stats.max}mm`}
            sub="highest recorded"
          />
          <StatCell
            label="Driest window"
            value={`${stats.min}mm`}
            sub="lowest recorded"
          />
        </div>
      )}

      {/* Interpretation note */}
      {!loading && !fetchErr && allWindows.length > 0 && (
        <div style={{ padding: '0.75rem 1.5rem', borderTop: `1px solid ${T.border}`, background: T.cream }}>
          <p style={{ fontSize: '0.72rem', color: T.textMuted, fontFamily: "'DM Mono', monospace", margin: 0, lineHeight: 1.6 }}>
            {isCall
              ? `Bars above the ${strike}mm strike line (amber) indicate windows where your option would start paying out. The band covers the full payout ramp to ${strike + spread}mm.`
              : `Bars below the ${strike}mm strike line indicate windows where your drought option would start paying out. The band covers the full ramp down to ${Math.max(0, strike - spread)}mm.`
            }
            {' '}Historical data from Open-Meteo · last 2 years.
          </p>
        </div>
      )}
    </div>
  );
}
