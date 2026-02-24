import { NextRequest, NextResponse } from 'next/server';

// ─── Rate limiter ─────────────────────────────────────────────────────────────
// In-memory store — fine for a single-instance demo/staging server.
// For multi-instance production swap this for Upstash Redis:
//   import { Ratelimit } from '@upstash/ratelimit';
//   import { Redis }     from '@upstash/redis';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const LIMIT      = 2;         // sorry but we have to limit the free demo key!
const WINDOW_MS  = 60_000;    // 1-minute rolling window

/** Returns { allowed, remaining, resetAt } for the given key. */
function rateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now   = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // First request in this window (or window has expired)
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: LIMIT - 1, resetAt: now + WINDOW_MS };
  }

  if (entry.count >= LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: LIMIT - entry.count, resetAt: entry.resetAt };
}

/** Pull the real client IP, respecting common proxy headers. */
function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────
// Mirrors the prompt and model used in workflows/risk.ts fetchGroqRiskSummary.
// In production this key lives in Chainlink's Vault DON via Confidential HTTP —
// here we use a server-side env var so the key is never exposed to the browser.

export async function POST(req: NextRequest) {
  // ── 1. Rate-limit check ──────────────────────────────────────────────────
  const ip = getIp(req);
  const { allowed, remaining, resetAt } = rateLimit(ip);

  const rateLimitHeaders = {
    'X-RateLimit-Limit':     String(LIMIT),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset':     String(Math.ceil(resetAt / 1000)), // Unix seconds
  };

  if (!allowed) {
    const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before requesting another summary.' },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          'Retry-After': String(retryAfterSec),
        },
      },
    );
  }

  // ── 2. API key guard ─────────────────────────────────────────────────────
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });
  }

  // ── 3. Parse & validate body ─────────────────────────────────────────────
  let body: {
    tvlEth?: unknown;
    utilizationPct?: unknown;
    expectedLossPct?: unknown;
    activeOptionsCount?: unknown;
    uniqueLocations?: unknown;
    netPnlEth?: unknown;
    alertThresholdPct?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    tvlEth,
    utilizationPct,
    expectedLossPct,
    activeOptionsCount,
    uniqueLocations,
    netPnlEth,
    alertThresholdPct,
  } = body;

  // Reject if any required field is missing or not a primitive
  const fields = { tvlEth, utilizationPct, expectedLossPct, activeOptionsCount, uniqueLocations, netPnlEth, alertThresholdPct };
  for (const [name, val] of Object.entries(fields)) {
    if (val === undefined || val === null || typeof val === 'object') {
      return NextResponse.json(
        { error: `Missing or invalid field: ${name}` },
        { status: 400 },
      );
    }
  }

  // ── 4. Build prompt ───────────────────────────────────────────────────────
  // Exact prompt from the CRE workflow so the summary matches what the
  // Chainlink nodes would produce when Confidential HTTP is live.
  const prompt =
    `You are a risk analyst for a parametric rainfall insurance protocol. ` +
    `Summarize the vault risk in 2-3 sentences for the operations team. ` +
    `All monetary values are in ETH. Do not convert to USD or any other currency.\n\n` +
    `Vault metrics:\n` +
    `- TVL: ${tvlEth} ETH\n` +
    `- Current utilization: ${utilizationPct}%\n` +
    `- Expected loss (forecast): ${expectedLossPct}% of TVL\n` +
    `- Active options: ${activeOptionsCount} across ${uniqueLocations} locations\n` +
    `- Net PnL: ${netPnlEth} ETH\n` +
    `- Alert threshold: ${alertThresholdPct}%`;

  // ── 5. Call Groq ──────────────────────────────────────────────────────────
  let groqRes: Response;
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:                 'compound-beta',
        messages:              [{ role: 'user', content: prompt }],
        max_completion_tokens: 256,   // trimmed from 1024 — summaries don't need more
        temperature:           1,
        top_p:                 1,
        stream:                false,
        stop:                  null,
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown fetch error';
    return NextResponse.json(
      { error: 'Failed to reach Groq API', detail: message },
      { status: 502 },
    );
  }

  if (!groqRes.ok) {
    const text = await groqRes.text();
    return NextResponse.json(
      { error: `Groq API error ${groqRes.status}`, detail: text },
      { status: groqRes.status },
    );
  }

  const data = await groqRes.json();
  const summary: string = data.choices?.[0]?.message?.content ?? '';

  return NextResponse.json({ summary }, { headers: rateLimitHeaders });
}