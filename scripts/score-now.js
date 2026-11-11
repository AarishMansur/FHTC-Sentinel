#!/usr/bin/env node
require('dotenv').config();

const appUrl = (process.env.SYNC_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const state = process.argv[2] || process.env.SYNC_STATE || 'Rajasthan';
const email = process.env.SCORE_EMAIL || 'state@jjm.gov.in';
const password = process.env.SCORE_PASSWORD || 'demo123';

async function main() {
  console.log(`[score-now] state=${state} app=${appUrl}`);

  const login = await fetch(`${appUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) {
    console.error(`[score-now] login failed (${login.status}). Is the app running? npm run dev`);
    process.exit(1);
  }
  const cookie = login.headers.getSetCookie()[0].split(';')[0];

  const res = await fetch(`${appUrl}/api/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ state }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    console.error('[score-now] failed:', JSON.stringify(data).slice(0, 800));
    process.exit(1);
  }
  const flagged = data.results.filter((r) => r.flagCount > 0);
  console.log(`[score-now] scored ${data.results.length} districts, ${flagged.length} flagged`);
  process.exit(0);
}

main().catch((e) => {
  console.error('[score-now] error', e.message || e);
  process.exit(1);
});
