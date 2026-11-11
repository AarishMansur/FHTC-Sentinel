#!/usr/bin/env node
require('dotenv').config();

const http = require('http');

const urlEnv = process.env.SYNC_URL || process.env.APP_URL || 'http://localhost:3000';
const state = process.argv[2] || process.env.SYNC_STATE || 'Rajasthan';
const target = new URL(urlEnv.replace(/\/$/, '') + '/api/sync');
const cronSecret = process.env.CRON_SECRET || null;

const payload = JSON.stringify({ state, source: process.env.SYNC_SOURCE || 'hargharjal' });

const options = {
  hostname: target.hostname,
  port: target.port || (target.protocol === 'https:' ? 443 : 80),
  path: target.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    ...(cronSecret ? { 'x-cron-secret': cronSecret } : {}),
  },
  timeout: 15 * 60 * 1000,
};

console.log(`[sync-now] state=${state} target=${target.origin}${target.pathname}`);

const req = http.request(target.protocol === 'https:' ? { ...options, protocol: 'https:' } : options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (res.statusCode >= 400 || !parsed.ok) {
        console.error(`[sync-now] failed status=${res.statusCode}`, data.slice(0, 2000));
        process.exit(1);
      }
      const r = parsed.result || {};
      console.log(`[sync-now] ok pages=${r.pages} fetched=${r.totalFetched} districts=${r.districtsUpserted} snapshots=${r.snapshotsUpserted} skipped=${r.featuresSkipped} warnings=${(r.warnings || []).length}`);
      if ((r.errors || []).length > 0) {
        console.error('[sync-now] per-feature errors:', r.errors.slice(0, 20));
        process.exit(1);
      }
      process.exit(0);
    } catch (e) {
      console.error('[sync-now] bad response', data.slice(0, 2000));
      process.exit(1);
    }
  });
});

req.on('timeout', () => {
  console.error('[sync-now] request timed out');
  req.destroy(new Error('timeout'));
});
req.on('error', (e) => {
  console.error('[sync-now] error', e.message || e);
  console.error('[sync-now] hint: start the app (npm run dev) and keep SYNC_URL/CRON_SECRET in .env in sync');
  process.exit(1);
});

req.write(payload);
req.end();
