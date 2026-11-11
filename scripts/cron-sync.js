#!/usr/bin/env node
require('dotenv').config();

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const lockPath = path.join(root, '.sync-lock.json');

const LOCK_HOURS = parseInt(process.env.SYNC_LOCK_HOURS || '20', 10) || 20;
const SYNC_URL = process.env.SYNC_URL || process.env.APP_URL || 'http://localhost:3000';
const state = process.env.SYNC_STATE || 'Rajasthan';

function readLock() {
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch {
    return null;
  }
}

function lockIsFresh(lock) {
  if (!lock || !lock.timestamp) return false;
  const ts = Date.parse(lock.timestamp);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < LOCK_HOURS * 3600 * 1000;
}

function acquireLock() {
  const existing = readLock();
  if (lockIsFresh(existing)) {
    console.log(`[cron-sync] last sync ${existing.timestamp} is under ${LOCK_HOURS}h old, skipping`);
    process.exit(0);
  }
}

const gate = process.env.CRON_ONLY_GATE === 'true';
if (gate) {
  const fresh = lockIsFresh(readLock());
  console.log(fresh ? 'fresh' : 'stale');
  process.exit(fresh ? 0 : 1);
}

acquireLock();

const child = spawn(process.execPath, [path.join(__dirname, 'sync-now.js'), state], {
  stdio: 'inherit',
  env: { ...process.env, SYNC_URL },
});

const started = new Date().toISOString();
child.on('exit', (code) => {
  if (code === 0) {
    try {
      fs.writeFileSync(lockPath, JSON.stringify({ timestamp: started, state }, null, 2));
    } catch (e) {
      console.error('[cron-sync] could not write lock file', e.message);
    }
  }
  process.exit(code || 1);
});
