# Implementation Plan — Phase 2 (Visual / UX Polish)

Presentation-only pass over the existing Next.js 16 + Supabase + Tailwind v4 app at `/home/gr3nn/Projects/PhishSim`. Work on `main`, no worktree. NO behavior/data/API changes. Phase 1 (CRUD + billing) is DONE — do not redo it.

## Context discovered during exploration (ground truth)

- **Build/verify commands** (from `package.json`): `npm run build` (Next build + typecheck), `npm run lint` (eslint). There is no test runner configured and no test files — verification is build + lint + Playwright screenshots. Dev server: `npm run dev` on port 3000.
- **Design system** lives entirely in `src/app/globals.css` (~460 lines, single file). Semantic classes confirmed present: `.content-page`, `.page-heading` (+ `.eyebrow`, `h1`, trailing `p`), `.stat-grid`/`.stat-card` (color modifiers `.blue/.violet/.amber/.rose`, `.stat-top > div`, `> strong`, `> small`, `[data-tooltip]`), `.data-panel`/`.data-panel-head`/`.table-scroll`/`.app-table`, `.panel`, `.studio-actions`, `.studio-preview` (iframe), `.button`(`.primary/.secondary/.danger`), `.field`, `.auth-message`(`.error/.success`), `.empty-state`, `.status-badge` (+ `.sent/.approved/.pending_approval/.pending/.rejected`), `.form-card`/`.form-section`, `.muted`.
- **Existing keyframes**: `menu-in` (dropdown/modal enter, `.16s ease`, used by `.notification-menu`, `.create-modal`, `.create-modal-backdrop`, `.marketing-mobile-menu`), `button-spin` (`.spin`), `bars-in` (dashboard chart). Existing `:active { transform: scale(.96) }` on `.button/.mini-button/.icon-button/.auth-submit/.google-button`. Hover lifts on `.stat-card`, `.resource-card`, buttons. `tw-animate-css@1.4.0` imported at `globals.css:2` but no `animate-*` utilities used yet.
- **Dashboard content wrapper**: `DashboardShell` renders children inside `<main className="page-content">`. Reference semantic pages wrap their body in `<div className="content-page">` with each block as a `<section>` or `.data-panel`.
- **Reference (already-semantic, DO NOT regress; mirror these):** `src/app/dashboard/landing-pages/[id]/page.tsx` (uses `.content-page` > `.page-heading` + `.studio-actions` with `.button secondary` links + `deleteLandingPage` via `SubmitButton confirmMessage`, then `.data-panel` > `.data-panel-head` + `.studio-preview` with `<iframe srcDoc sandbox="">`), `src/app/dashboard/templates/[id]/edit/page.tsx`, `src/app/dashboard/groups/[id]/edit/page.tsx` (ALREADY semantic — Phase 1).
- **`SubmitButton`** (`src/components/submit-button.tsx`): `'use client'`, props `label`, `pendingLabel`, `className`, `title`, `confirmMessage` (uses `window.confirm`). Used inside a `<form action={serverAction.bind(null, id)}>` for designed delete controls — this is the established delete pattern (landing-page detail uses it).
- **Server actions available (presentation surfaces only, do NOT alter logic):** `deleteCampaign(id)` in `campaigns/actions.ts` (has `.eq('user_id')`, redirects to `/dashboard`); `deleteTemplate(id)` in `templates/actions.ts` (redirects to `/dashboard/templates`).
- **Four raw-Tailwind screens confirmed:** `campaigns/[id]/CampaignDetailsClient.tsx` (indigo/gray, `StatCard` with `border-l-4`), `templates/[id]/page.tsx` (indigo/gray), `groups/[id]/page.tsx` (indigo/gray). `groups/[id]/edit/page.tsx` is **already semantic** — verify-only, no rebuild.
- **No `loading.tsx` / `error.tsx` / `not-found.tsx` exist anywhere** (confirmed by search).
- **Detail pages already call `notFound()`** when a record is missing: campaign, template, group, landing-page detail all do. Group/landing/template-edit also filter by `user_id`. Campaign/template/group detail query without `user_id` but rely on RLS — leave as-is (behavior change out of scope).

## MUST NOT CHANGE (state explicitly, honor throughout)

- All safety framing / "credentials are NOT stored" text; admin-approval workflow; the `.env` file and every env var name.
- All routes, server actions, DB column names, form field names, the `{{link}}` token.
- Sandboxed preview iframes keep `sandbox=""`.
- `src/app/fake-login/page.tsx` stays AS-IS (intentionally mimics Microsoft).
- All Phase-1 functionality: realtime event subscription, stats math, delete actions, status display, AI editor behavior, `CreateResourceDialog` logic.
- No new dependencies, no Framer Motion, no Tailwind-utility styling on rebuilt screens — semantic classes + CSS keyframes + `tw-animate-css` only.

---

## Part A — Motion layer + shared classes in globals.css (do FIRST; everything else consumes it)

- [ ] 1. Add the reusable motion keyframes, classes, and a global reduced-motion guard to `src/app/globals.css`.
      Append a new `/* Phase 2 — motion layer */` block near the end (before the first `@media` query). Define keyframes `fade-in` (`from{opacity:0} to{opacity:1}`), `fade-in-up` (`from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none}`), `pop-in` (modal panel: `from{opacity:0;transform:translateY(8px) scale(.98)} to{opacity:1;transform:none}`), `skeleton-shimmer` (`from{background-position:-150% 0} to{background-position:250% 0}`). Add classes: `.fade-in { animation: fade-in .2s ease both }`, `.fade-in-up { animation: fade-in-up .26s ease both }`. Add a stagger helper: scope `.content-page > section`, `.content-page > .data-panel`, and `.marketing-section`/marketing hero/feature blocks to `fade-in-up` with incremental `animation-delay` using `:nth-child` (e.g. 1→0ms, 2→60ms, 3→120ms, 4→180ms, cap ~5). Add `.resource-grid > *` and `.app-table tbody tr` / `.campaign-list .campaign-row` subtle `fade-in-up`/`fade-in` with small `:nth-child` stagger (cap the nth list so long tables don't delay excessively, e.g. delays only up to nth-child(8)). Wrap ALL mount animations in `@media (prefers-reduced-motion: no-preference) { ... }` so motion only applies when the user allows it. Add a defensive `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; } }` override at the very end.
      Also add a `.skeleton` utility (shimmer gradient block honoring `--line`/`--surface`, dark-mode via `.dark .skeleton`) and `.skeleton-row`/`.skeleton-card` sizing helpers for the loading screens, plus `.center-pad` (a simple padded flex-center container for error/404/loading spinner states) using existing tokens.
      Files: `src/app/globals.css`
      Verify: `npm run build` succeeds and `npm run lint` is clean; no raw CSS syntax errors. Visual confirmation deferred to the screenshot step (Part E).

- [ ] 2. Add modal enter polish and editor tab crossfade classes to `src/app/globals.css`.
      The `.create-modal-backdrop`/`.create-modal` already animate via `menu-in`; upgrade only the panel: give `.create-modal` `animation: pop-in .2s ease` and keep `.create-modal-backdrop` on a backdrop `fade-in .18s ease` (replace its current `menu-in`). Add a `.studio-preview.fade-in`/tab-swap class: define `.editor-fade { animation: fade-in .18s ease both }` to be applied to the shown pane in `ai-html-editor.tsx` (step 12). Keep everything inside `@media (prefers-reduced-motion: no-preference)` where it is purely decorative. Do not alter modal open/close logic.
      Files: `src/app/globals.css`
      Verify: `npm run build` + `npm run lint` clean.

---

## Part B — Rebuild the four raw-Tailwind screens in the semantic system

- [ ] 3. Rebuild `CampaignDetailsClient.tsx` in the semantic design system; preserve ALL behavior.
      Keep `'use client'`, the realtime `supabase.channel(...).on('postgres_changes', INSERT events filter campaign_id)` subscription, the `stats` reduction, the `targetStatus` derivation, the `handleDelete` flow calling `deleteCampaign`, and the status display. Replace raw markup: root `<div className="content-page">`; header as `<section className="page-heading">` with `<p className="eyebrow">Campaigns</p>`, `<h1>{campaign.title}</h1>`, a sub `<p>` ("Launched {date} · {status}"), and a `.studio-actions` cluster — conditional Edit `<Link className="button secondary">` for `pending_approval`/`draft`, and the Delete as a `<button className="button danger">` calling `handleDelete`. **Replace `alert('Failed to delete campaign')` with a designed inline error**: add `const [deleteError, setDeleteError] = useState('')`, set it in the catch, and render `{deleteError && <div className="auth-message error">{deleteError}</div>}` in the header (fades in via the global `.auth-message` + add `fade-in`). Stats as `<div className="stat-grid">` of four `.stat-card` (map colors: Sent→`.blue`, Opened→`.amber`, Clicked→`.violet`, Compromised→`.rose`); each card `.stat-top` label + icon div, `<strong>{value}</strong>`, `<small>`. Target Status and Event Log as two `.data-panel` blocks: `.data-panel-head` with `<h2>` + count `<p>`, then `.table-scroll` > `.app-table` with proper `<thead>`/`<tbody>`; Target Status rows show email + a `.status-badge` (map Pending/Sent/Opened/Clicked/Compromised to badge modifier classes, defaulting to base badge for custom statuses); Event Log rows show target_email, event_type, IP, timestamp. Keep the empty-state handling (if no targets/events render a muted row or `.empty-state`). **Fix the misleading `Target` type**: change `{ id; email; first_name?; last_name? }` to `{ id: string; email: string; name?: string }` (matches the `targets` table; the component only reads `target.email`). Update `src/app/dashboard/campaigns/[id]/page.tsx` to wrap the client in `<div className="content-page">`? No — the client now renders `.content-page` itself, so change the page wrapper from `<div className="p-8">` to a plain fragment (`<>…</>`) to avoid double padding.
      Files: `src/app/dashboard/campaigns/[id]/CampaignDetailsClient.tsx`, `src/app/dashboard/campaigns/[id]/page.tsx`
      Verify: `npm run build` + `npm run lint` clean; grep the file to confirm NO `indigo-`/`bg-gray-`/`rounded-md` utilities remain and no `alert(` call remains; screenshot in Part E confirms realtime panel + stats render and Delete shows inline error on failure.

- [ ] 4. Rebuild `templates/[id]/page.tsx` in the semantic system with a sandboxed preview, mirroring the landing-page detail layout.
      Keep it a server component; keep the `email_templates` fetch and `notFound()`. Root `<div className="content-page">`; `<section className="page-heading">` with `<p className="eyebrow">Templates</p>`, `<h1>{template.name}</h1>`, sub `<p>Subject: {template.subject}</p>`, and a `.studio-actions` cluster: Edit `<Link href={.../edit} className="button secondary">` (keep `Pencil` icon) and a **Delete control using the established pattern** — `<form action={deleteTemplate.bind(null, template.id)}><SubmitButton label="Delete" className="button secondary" confirmMessage="Delete this template? This cannot be undone." /></form>` (import `deleteTemplate` from `../actions` and `SubmitButton` from `@/components/submit-button`). This is presentation-only surfacing of the existing action; do not modify `deleteTemplate`. Preview as `<div className="data-panel">` > `.data-panel-head` (`<h2>Preview</h2>` + `<p>How the email body renders.</p>`) > `<div className="studio-preview"><iframe title="Template Preview" srcDoc={template.body_html} sandbox="" /></div>`. Keep an HTML-source block but restyle it: a second `.data-panel` with `<pre className="studio-code">` (reuse the studio code styling) instead of raw `bg-gray-100`.
      Files: `src/app/dashboard/templates/[id]/page.tsx`
      Verify: `npm run build` + `npm run lint` clean; grep confirms no `indigo-`/`gray-` utilities; confirm `sandbox=""` present on the iframe; screenshot in Part E.

- [ ] 5. Rebuild `groups/[id]/page.tsx` in the semantic system using `.data-panel`/`.app-table`.
      Keep server component, the `groups` + `targets` fetch, and `notFound()`. Root `<div className="content-page">`; `<section className="page-heading">` with `<p className="eyebrow">Groups</p>`, `<h1>{group.name}</h1>`, sub `<p>Created {date}</p>`, and `.studio-actions` with Edit `<Link className="button secondary">`. Recipients as `<div className="data-panel">` > `.data-panel-head` (`<h2>Recipients ({count})</h2>` + `<p>People in this group.</p>`) > `.table-scroll` > `.app-table` with `<thead>` (Email / Name) and `<tbody>` rows (`<strong>` email, `.muted` name or "—"). Empty case: a single full-width row with `.muted` "No recipients in this group." (or an `.empty-state` block). Keep terminology consistent with the already-semantic group edit page which says "recipients".
      Files: `src/app/dashboard/groups/[id]/page.tsx`
      Verify: `npm run build` + `npm run lint` clean; grep confirms no `indigo-`/`gray-` utilities; screenshot in Part E.

- [ ] 6. Verify-only: confirm `groups/[id]/edit/page.tsx` is already semantic; lightly align, do not regress.
      Read it (already `.content-page`/`.page-heading` + `EditGroupForm`). Only change if an obvious inconsistency exists vs the rebuilt sibling screens (e.g. eyebrow wording). Do NOT restructure the form or `EditGroupForm` logic.
      Files: `src/app/dashboard/groups/[id]/edit/page.tsx` (likely no change)
      Verify: `npm run build` + `npm run lint` clean.

---

## Part C — Missing states (loading / error / not-found)

- [ ] 7. Add `src/app/dashboard/loading.tsx` with a tasteful skeleton.
      Server/stateless component rendering inside the dashboard `page-content`. Use a `.content-page` wrapper containing a `.page-heading` skeleton (two `.skeleton` bars) + a `.stat-grid` of four `.skeleton-card` + a `.data-panel` with several `.skeleton-row`s, all using the `.skeleton` shimmer class from step 1. No client hooks needed.
      Files: `src/app/dashboard/loading.tsx`
      Verify: `npm run build` + `npm run lint` clean; manually hit a dashboard route with network throttling in Part E to confirm the skeleton appears.

- [ ] 8. Add per-heavy-route `loading.tsx` for the detail routes (cheap, reuse skeleton classes).
      Create minimal `loading.tsx` at `campaigns/[id]`, `templates/[id]`, `landing-pages/[id]`, `groups/[id]`, each rendering a `.content-page` with a `.page-heading` skeleton + one `.data-panel` of `.skeleton-row`s (or a `.center-pad` with the `.spin` spinner for the lightest ones). Keep them tiny and consistent.
      Files: `src/app/dashboard/campaigns/[id]/loading.tsx`, `src/app/dashboard/templates/[id]/loading.tsx`, `src/app/dashboard/landing-pages/[id]/loading.tsx`, `src/app/dashboard/groups/[id]/loading.tsx`
      Verify: `npm run build` + `npm run lint` clean.

- [ ] 9. Add `src/app/dashboard/error.tsx` (`'use client'`) with a designed on-brand error panel + reset.
      Standard Next error boundary signature `({ error, reset }: { error: Error & { digest?: string }; reset: () => void })`. Render a `.center-pad` / `.content-page` with an `.empty-state`-style panel: icon, `<h3>Something went wrong</h3>`, a `.muted` message (show a generic line, not `error.message` raw unless safe), and a `<button className="button primary" onClick={reset}>Try again</button>` plus a `.button secondary` link back to `/dashboard`. Apply `fade-in`.
      Files: `src/app/dashboard/error.tsx`
      Verify: `npm run build` + `npm run lint` clean (client component must have `'use client'`).

- [ ] 10. Add a root `error.tsx` and a `global-error.tsx` fallback (optional-but-cheap) + `not-found.tsx` (root and dashboard) with a designed 404.
      `src/app/not-found.tsx`: a centered on-brand 404 (reuse marketing or `.center-pad` styling with brand mark, `<h1>404</h1>`, message, `.button primary` link to `/`). `src/app/dashboard/not-found.tsx`: same but link to `/dashboard`, rendered within the dashboard shell context. `src/app/error.tsx` (`'use client'`): root-level designed error with reset. (Skip `global-error.tsx` unless build asks for it.) The detail pages already call `notFound()` on missing records — no wiring needed; just confirm during Part E that hitting a bad id shows the designed 404, not a raw page.
      Files: `src/app/not-found.tsx`, `src/app/dashboard/not-found.tsx`, `src/app/error.tsx`
      Verify: `npm run build` + `npm run lint` clean; Part E visits a non-existent `/dashboard/templates/<bad-uuid>` to confirm the designed 404.

---

## Part D — Apply the motion layer to targeted components

- [ ] 11. Confirm the `.content-page > section` / list stagger from step 1 lands on rebuilt + existing pages (no per-file edits expected).
      Because the stagger is scoped by CSS selector to `.content-page > section`/`.data-panel`, `.resource-grid > *`, `.app-table tbody tr`, `.campaign-list .campaign-row`, and marketing sections, the rebuilt screens (Part B) and existing semantic pages inherit it automatically. Spot-check that rebuilt screens use `<section>`/`.data-panel` as direct children of `.content-page` so the selector matches; adjust markup in Part B files only if a wrapper breaks the direct-child relationship.
      Files: none (verification of Part B markup) — or minor markup tweak in the Part B files if needed.
      Verify: Part E screenshots show sections fading/rising in on mount in light + dark.

- [ ] 12. Apply the editor tab crossfade in `ai-html-editor.tsx` (presentation only).
      The component swaps Code/Preview via `tab` state and `hidden` class. Add the `editor-fade` class (from step 2) to whichever pane is shown so switching tabs crossfades instead of snapping: e.g. `className={tab === 'code' ? 'studio-code editor-fade' : 'hidden'}` and `className={tab === 'preview' ? 'studio-preview editor-fade' : 'hidden'}`, keyed by `tab` so React remounts and replays the animation (add `key={tab}` on each pane or a wrapping element as needed). Do NOT change AI generation, `onHtmlChange`, `srcDoc`, or `sandbox=""`.
      Files: `src/components/ai-html-editor.tsx`
      Verify: `npm run build` + `npm run lint` clean; Part E toggles Code↔Preview in the landing/template editor and confirms a gentle crossfade, iframe still `sandbox=""`.

- [ ] 13. Confirm modal + marketing motion (no logic edits).
      `create-resource-dialog.tsx` renders `.create-modal-backdrop`/`.create-modal` whose animation now comes from step 2's CSS — no TS change needed; verify the panel pops in gently. Marketing sections inherit the step-1 fade-in-up via CSS selectors — no edits to `page.tsx`/`features`/`pricing` required. Inline confirmations (`.auth-message` in forms, the new campaign delete error) get `fade-in` via class added in Part B / already-present `.auth-message`.
      Files: none (verification) — add a `fade-in` class to `.auth-message` usages only where a confirmation pops abruptly, if observed.
      Verify: Part E opens the create dialog and confirms a centered, gently-animated modal; confirms press `:active` feedback is consistent (already global).

---

## Part E — Consistency sweep, dark mode, responsive, and screenshot verification

- [ ] 14. Light global consistency pass over the touched screens.
      Compare the three rebuilt screens against the landing-page detail reference for spacing/heading/eyebrow wording and `.studio-actions` button order. Ensure dark mode works on every touched screen (the semantic classes already have `.dark` rules for `.data-panel`, `.stat-card`, `.app-table th`, inputs — rebuilt screens inherit them; verify no hardcoded light colors slipped in). Do NOT redesign already-good screens or do P2 cleanup.
      Files: the Part B/C files as needed (minor tweaks only)
      Verify: `npm run build` + `npm run lint` clean.

- [ ] 15. Run the full verification + screenshot plan.
      Start the dev server: `npm run dev` (port 3000; confirm it comes up). Use headless Playwright (already available as an MCP tool) to capture screenshots into `/home/gr3nn/Projects/PhishSim/.agents/tasks/phase2-shots/`. Capture, at minimum, the PUBLIC pages reachable without auth in BOTH light and dark (toggle via the marketing theme button or `prefers-color-scheme`): `/` (home), `/features`, `/pricing`, `/login`. If a test/dev session can reach the dashboard, also capture: dashboard overview (skeleton + loaded), a rebuilt campaign detail, template detail, group detail, the create-resource modal open, the AI editor Code and Preview tabs, a designed 404 (`/dashboard/templates/<bad-uuid>`), and the dashboard error boundary if triggerable. If auth blocks the dashboard, note that in the run output and rely on the public-page shots plus `npm run build`/`npm run lint` as the gate. Name files `<page>-<light|dark>.png`. Finally run `npm run build` and `npm run lint` one last time; both must pass. Clean up any temporary files created for screenshotting.
      Files: screenshots under `/home/gr3nn/Projects/PhishSim/.agents/tasks/phase2-shots/`
      Verify: `npm run build` exits 0, `npm run lint` clean, screenshots exist for at least `/`, `/features`, `/pricing`, `/login` in light + dark; rebuilt screens show no indigo/gray palette; motion visible; dark mode intact.

---

## Notes / assumptions

- No test framework exists; "verify" means `npm run build` (includes typecheck) + `npm run lint` + Playwright screenshots. This is the project's real gate.
- Dashboard screenshots depend on an authenticated session; if unavailable in the sandbox, public pages + build/lint are the accepted gate (noted so the reviewer does not treat missing dashboard shots as a failure).
- Group edit (`groups/[id]/edit`) is already semantic from Phase 1 — treated as verify-only to avoid regression.
- The `deleteCampaign` "prototype/assume cascade" comment and ownership-filter gaps on `deleteTemplate`/`deleteGroup` are **P2 (Phase 3) cleanup — out of scope here**; do not touch action logic.
- All motion is wrapped in `@media (prefers-reduced-motion: no-preference)` with a global `reduce` override, so reduced-motion users get a static UI.

---

## Phase 2 verification note (appended after implementation)

Commands run from `/home/gr3nn/Projects/PhishSim`:
- `npm run build` → exit 0 (Next 16 / Turbopack production build, includes typecheck; full route tree compiled, `/dashboard/*` detail routes present).
- `npm run lint` → exit 0 (eslint, no warnings/errors).

Grep confirmations:
- The four rebuilt screens (`campaigns/[id]/CampaignDetailsClient.tsx`, `templates/[id]/page.tsx`, `groups/[id]/page.tsx`, `groups/[id]/edit/page.tsx`) contain no `indigo-`/`bg-gray-`/`text-gray-`/`rounded-md` raw utilities (no matches).
- The campaign `alert('Failed to delete campaign')` is gone — replaced by inline `.auth-message error` state (no `alert(` matches).
- All preview iframes keep `sandbox=""` (templates detail, ai-html-editor, landing-pages detail).
- No server-action / route / column / form-field / `{{link}}` changes; `git diff --stat` on `actions.ts` files shows no changes. `.env` is untracked and untouched; `fake-login/page.tsx` has no diff.

Visual verification: dev server (`next dev -p 3000`) started; headless Playwright (chromium) captured public pages in BOTH light and dark into `.agents/tasks/phase2-shots/` — home, features, pricing, login, and the designed 404 (10 PNGs). Dashboard screens require Supabase auth (routes 307-redirect to `/login` unauthenticated; no dev/test auth path exists), so they were verified by build + static review rather than screenshots. The temporary `playwright` dev dependency used only for screenshotting was uninstalled (package.json / lockfile restored to no diff).
