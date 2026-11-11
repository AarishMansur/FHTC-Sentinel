# FHTC Sentinel — Design System

A calm, premium, white-tech console: "Linear meets a modern government dashboard". Trustworthy, precise, printable, readable in sunlight.

## Stack note

Visual/UX overhaul only. `lib/`, `prisma/`, `config/`, `scripts/` and all `app/api/*` route logic are untouched; all styling lives in the UI kit and page markup. Additive read-only data pulls (e.g. last-sync timestamps, briefing text for previews) use the existing Prisma models.

## Tokens (single source of truth)

`tailwind.config.js` + CSS variables in `app/globals.css`.

| Token | Value | Use |
|---|---|---|
| `page` | `#F7F7F4` | app background (warm off-white) |
| `surface` | `#FFFFFF` | cards, tables, inputs |
| `subtle` | `#F1F1ED` | table headers, hover rows, code wells |
| `border` / `border-strong` | `#E6E5DF` / `#D3D2CA` | 1px hairlines |
| `ink` / `ink-secondary` / `ink-muted` | `#141414` / `#5C5C57` / `#8C8C86` | text primary / secondary / captions |
| `brand` / `brand-soft` / `brand-hover` | `#0F5E7A` / `#E3F1F6` / `#0B4A62` | primary actions, active nav, trust accents |
| `sev1…sev5` | pairs (fg/bg) | severity scales ONLY, always paired with a text label |

Severity is never conveyed by color alone: every chip prints its `S1–S5` label and word (info/low/medium/high/critical), and print views stay legible in grayscale.

### Fonts

- `next/font/google`: **Inter** (UI), **Noto Sans Devanagari** (Hindi — applies automatically because the `sans` stack lists it after Inter and Inter has no Devanagari glyphs), **JetBrains Mono** (codes, hashes, evidence JSON).
- Numbers always render `tabular-nums` (tables have it by default via globals.css).

### Shape & elevation

- Radius scale: **8px** inputs/buttons, **12px** cards, **16px** large panels/letterhead. Nothing else.
- Shadows: floating elements only (`shadow-float`: dropdowns, drawers, toasts, the A4 sheet preview). Everything else is a 1px border.
- Spacing follows Tailwind's default 4px grid; content width caps at `max-w-content` (1280px).

## Components (`components/ui/`)

- **Button** — cva variants `primary | secondary | ghost | danger`, sizes `sm | md | lg` (lg = 44px touch target), `loading` state with spinner.
- **Card / CardHeader** — the workhorse surface.
- **Badge / SeverityBadge** — status chips; severity chips carry S-labels.
- **StatCard** — KPI card: 12px muted label, 28px tabular number with one-time count-up (reduced-motion aware), optional colored left accent.
- **HeatBar** — 0–100 risk bar on the severity scale, value always shown beside it.
- **StackedSeverityBar** — horizontal stacked severity breakdown (Impact).
- **DataTable** — sticky header, hover, client-side column sorting, whole-row activation with keyboard support (a real `<Link>` stays in the first cell), stacked cards below `md`.
- **Input / Select / Toggle / Label** — 8px radius, inline validation via `aria-invalid` + styled inputs.
- **SegmentedControl** — EN / हिंदी toggles.
- **Toast / ToastProvider / useToast** — bottom-right stack, success/warning/error variants.
- **Skeleton / SkeletonRows** — shimmer placeholders matching final layouts (static fill under reduced motion).
- **EmptyState** — explains why it's empty and names the recovery action.
- **CodeBlock / CopyText** — mono wells and click-to-copy hashes.
- **PageHeader** — breadcrumbs + page title + action row + metadata chips.
- **SourceChip** — data-freshness chip; falls back to warning styling ("Offline fallback snapshot") when data is stale.
- **Logo / LogoMark** — droplet-over-contours brand mark.

Shell (`components/shell/AppShell.tsx`): 240px white sidebar (nav, user card with role badge + scope chip, log out), sticky section bar with **Sync now / Score now** for `state_admin` only (spinners + toasts), mobile drawer with 44px targets. Feeds on the existing `/api/auth/whoami`, `/api/sync`, `/api/score`, `/api/auth/logout`.

## Routes

- `/` quiet splash → dashboard/login.
- `/login` — centered card, dotted pattern, demo-accounts disclosure (non-production builds only).
- `/dashboard` — KPI strip, filter bar (search, S1–S5 chips, rule select, flagged-only), ranked table, CSV export, loading skeleton.
- `/district/[id]` — letterhead header, stacked bucket chart (sequential teal ramp, no rainbow) + flag cards with expandable evidence JSON; right column: field-check ladder (EN/हिन्दी), latest snapshot grid, briefing preview.
- `/district/[id]/briefing` — web briefing with generate button.
- `/district/[id]/briefing/print` — A4 view in the `(print)` route group (pure white, letterhead, grayscale-safe, `@media print` rules in globals.css).
- `/audit` — agent-run ledger with deterministic-run badges, click-to-copy hashes, expandable metadata.
- `/impact` — hero summary sentence + KPIs + severity breakdown.

## Usage rules

1. Never hardcode hex values in pages — use tokens; re-skinning happens in `tailwind.config.js` + `globals.css` only.
2. Severity tokens only on flags/scores/heat surfaces, never on ordinary UI chrome.
3. Buttons are 8px radius; don't invent pill shapes.
4. New server data reads must be additive — no API route or business-logic edits.
5. Field-check copy in `components/ui/fieldChecks.ts` mirrors `lib/briefingAgent.ts` (v3) — update both together if the template changes.
