import { NextRequest, NextResponse } from 'next/server';

// Mirrors the prompt and model used in workflows/risk.ts fetchGroqRiskSummary.
// In production this key lives in Chainlink's Vault DON via Confidential HTTP —
// here we use a server-side env var so the key is never exposed to the browser.

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });
  }

  const {
    tvlEth,
    utilizationPct,
    expectedLossPct,
    activeOptionsCount,
    uniqueLocations,
    netPnlEth,
    alertThresholdPct,
  } = await req.json();

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

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:                  'compound-beta',   // groq/compound in CRE maps to compound-beta on the REST API
      messages:               [{ role: 'user', content: prompt }],
      max_completion_tokens:  1024,
      temperature:            1,
      top_p:                  1,
      stream:                 false,
      stop:                   null,
    }),
  });

  if (!groqRes.ok) {
    const text = await groqRes.text();
    return NextResponse.json(
      { error: `Groq API error ${groqRes.status}`, detail: text },
      { status: groqRes.status },
    );
  }

  const data = await groqRes.json();
  const summary: string = data.choices?.[0]?.message?.content ?? '';

  return NextResponse.json({ summary });
}