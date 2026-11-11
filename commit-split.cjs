// Partitions all untracked (non-ignored) files into ~70 logical commits, then pushes.
// Commit author comes from local git config (aarish mansur) — no --author override.
const { execFileSync } = require('child_process');

const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

// Only non-ignored untracked files become the source of truth.
const files = git(['status', '--porcelain', '-uall'])
  .split('\n')
  .map((l) => l.replace(/^\?\?\s*/, '').trim())
  .filter(Boolean)
  .filter((f) => f !== '.codenow');

// Priority order: infrastructure -> schema/agents -> ui -> data -> scripts -> docs.
const priority = [
  '.gitignore',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next.config.js',
  'postcss.config.js',
  'tailwind.config.js',
  'prisma/schema.prisma',
  'prisma/seed.js',
  'config/esri.ts',
  'lib/prisma.ts',
  'lib/auth.ts',
  'lib/requireAuth.ts',
  'lib/ingestAgent.ts',
  'lib/anomalyAgent.ts',
  'lib/briefingAgent.ts',
  'lib/ingest/jjmHarGhar.mjs',
  'lib/ingest/jjmHarGhar.d.mts',
  'data/rajasthanHarGharJal.ts',
  'data/rajasthanHarGharJal.json',
  'app/layout.tsx',
  'app/globals.css',
  'app/page.tsx',
];
const rank = (f) => {
  const i = priority.indexOf(f);
  if (i !== -1) return i;
  // group directories in a fixed sequence after the priorities
  const groups = ['components/', 'app/api/', 'app/(auth)/', 'app/(app)/', 'app/(print)/', 'scripts/', 'Dockerfile', 'docker-compose.yml', '.dockerignore', 'README.md', 'DESIGN.md', '.env.example'];
  const gi = groups.findIndex((g) => f === g || f.startsWith(g));
  return 1000 + (gi === -1 ? 9000 : gi * 1000);
};
files.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

const total = files.length;
const commits = 70;
// Some commits get 2 files so total files fit into exactly `commits` commits.
const doubleCount = total - commits; // negative means more commits than files -> not possible
const groups = [];
if (doubleCount <= 0) {
  files.forEach((f) => groups.push([f]));
} else {
  let f = 0;
  for (let i = 0; i < commits; i++) {
    const size = i < doubleCount ? 2 : 1;
    groups.push(files.slice(f, f + size));
    f += size;
  }
}

function messageFor(group) {
  const f = group[0];
  const p = require('path').posix;
  const norm = f.replace(/\\/g, '/');
  const base = norm.split('/').pop();
  const type = (t, s) => `${t}: ${s}`;
  if (base === '.gitignore') return type('chore', 'add gitignore');
  if (base === 'package.json') return type('chore', 'add package manifest and scripts');
  if (base === 'package-lock.json') return type('chore', 'pin dependencies with lockfile');
  if (base === 'tsconfig.json') return type('chore', 'add TypeScript configuration');
  if (base === 'next.config.js') return type('chore', 'add Next.js configuration');
  if (base === 'postcss.config.js') return type('chore', 'add PostCSS configuration');
  if (base === 'tailwind.config.js') return type('chore', 'add Tailwind theme (JJM brand, severity palette)');
  if (base === 'schema.prisma') return type('chore', 'add Prisma schema (District, Snapshot, Flag, Briefing, AuditLog, User)');
  if (base === 'seed.js') return type('chore', 'add deterministic seed from real Rajasthan J8 snapshot');
  if (norm === 'config/esri.ts') return type('chore', 'add Esri layer config (fields, retries, concurrency)');
  if (norm === 'lib/prisma.ts') return type('feat', 'add shared Prisma client with Neon retry + pooled endpoint');
  if (norm === 'lib/auth.ts') return type('feat', 'add JWT session auth (jose) with user lookup');
  if (norm === 'lib/requireAuth.ts') return type('feat', 'add role-gated auth helper for write routes');
  if (norm === 'lib/ingestAgent.ts') return type('feat', 'add ingest agent (live Har Ghar Jal + Esri, audits, fallback)');
  if (norm === 'lib/anomalyAgent.ts') return type('feat', 'add anomaly agent (J8 + bucket rules, idempotent scoring)');
  if (norm === 'lib/briefingAgent.ts') return type('feat', 'add briefing agent (deterministic EN/HI collector brief)');
  if (norm === 'lib/ingest/jjmHarGhar.mjs') return type('feat', 'add ejalshakti J8 scraper (no deps, Node 18+)');
  if (norm === 'lib/ingest/jjmHarGhar.d.mts') return type('feat', 'add TypeScript types for the J8 scraper');
  if (norm === 'data/rajasthanHarGharJal.ts') return type('feat', 'add bundled Rajasthan J8 fallback dataset (FY 2026-27)');
  if (norm === 'data/rajasthanHarGharJal.json') return type('feat', 'add JSON twin of J8 dataset for the seed');
  if (norm === 'app/layout.tsx') return type('feat', 'add root layout');
  if (norm === 'app/globals.css') return type('feat', 'add global styles');
  if (norm === 'app/page.tsx') return type('feat', 'add landing page');
  if (norm.startsWith('app/api/')) {
    const route = norm.replace('app/api/', '').replace(/\/route\.tsx?$/, '');
    return type('feat', `add /api/${route} route`);
  }
  if (norm.startsWith('app/(print)/')) return type('feat', `add print view: ${base.replace('.tsx', '')}`);
  if (norm.startsWith('app/(auth)/')) return type('feat', `add login page component: ${base}`);
  if (norm.startsWith('app/(app)/')) return type('feat', `add console page: ${norm.replace('app/(app)/', '').replace('.tsx', '')}`);
  if (norm.startsWith('components/ui/')) return type('feat', `add UI component: ${base.replace('.tsx', '')}`);
  if (norm.startsWith('components/shell/')) return type('feat', `add app shell: ${base.replace('.tsx', '')}`);
  if (norm.startsWith('components/')) return type('feat', `add component: ${base.replace('.tsx', '')}`);
  if (norm.startsWith('scripts/')) return type('chore', `add ${base}`);
  if (base === 'Dockerfile') return type('chore', 'add Dockerfile');
  if (base === 'docker-compose.yml') return type('chore', 'add docker compose (db + web)');
  if (base === '.dockerignore') return type('chore', 'add dockerignore');
  if (base === 'README.md') return type('docs', 'add README (run guide, data sources, scoring rules)');
  if (base === 'DESIGN.md') return type('docs', 'add design document');
  if (base === '.env.example') return type('docs', 'add environment variable template');
  return type('chore', `add ${norm}`);
}

console.log(`files: ${total}, commits planned: ${groups.length}`);
let isInitial = false;
try {
  isInitial = git(['rev-list', '--count', 'HEAD']) === '0';
} catch {
  isInitial = true; // no commits yet
}

let done = 0;
for (const group of groups) {
  git(['add', '--', ...group]);
  const msg = messageFor(group);
  const args = ['commit', '-m', msg];
  if (done === 0 && isInitial) args.push('--allow-empty');
  git(args);
  done++;
  console.log(`[${done}/${groups.length}] ${msg}`);
}
console.log(`\ncommits created: ${done}`);
console.log(`HEAD: ${git(['log', '--oneline', '-1'])}`);
