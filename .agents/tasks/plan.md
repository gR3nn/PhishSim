# Implementation Plan — Typography Fix + Bug-Hunt Overhaul (PhishSafe)

Scope: FIX THE TYPOGRAPHY first (the user's loudest complaint), then a fresh bug-hunt / overhaul pass. Work on `main`, no worktree. Keep the semantic-class CSS design system in `src/app/globals.css`. No new UI/CSS/animation libraries. No Tailwind-utility restyling of existing screens.

Build/verify commands (from `package.json`, Node pinned `>=22.23.4 <23` in `.nvmrc`):
- Type/build check: `npm run build` (Next.js 16 `next build`, runs TS + ESLint).
- Lint only (faster inner loop): `npm run lint`.
- There is no unit-test runner configured; `npm run build` is the authoritative gate. Also do a manual visual check with `npm run dev` on port 3000 for the type-scale and dark-mode / breakpoint verification items that the build cannot catch.

Exploration confirmed several audit "P2" items are ALREADY FIXED in prior phases and must NOT be re-done:
- No `alert()` remains in `src/` (grep clean) — error UIs already use `.auth-message`/inline patterns.
- `CampaignDetailsClient.tsx` `Target` type is already `{ id, email, name? }` (the `first_name/last_name` mismatch is gone).
- `deleteGroup` / `deleteTemplate` already carry `.eq('user_id', user.id)` ownership filters (templates also block defaults + check `user_id`).
- `updateGroup` already manages recipients/targets, not just the name.
- The Stripe webhook route (`src/app/api/webhooks/stripe`) and landing-page `[id]` detail + `[id]/edit` routes already exist.
- `deleteCampaign` already has the ownership filter and a correct cascade comment.
Do not "fix" these; they are done.

---

## PHASE A — TYPOGRAPHY (do this first)

### A1. Primary font bug: apply the Geist font-family to the document

- [ ] 1. Set the base font-family so the app actually renders in Geist instead of the browser default serif.
      Root cause (confirmed): `layout.tsx` puts `${geistSans.variable} ${geistMono.variable} antialiased` on `<body>` and `globals.css` maps them in `@theme inline` to `--font-sans`/`--font-mono`, but NOTHING sets `font-family` on `html`/`body`. There are two `body { }` rules (globals.css line ~122 `@apply bg-background text-foreground`, and line ~143 `margin/background/color`) and neither sets a font. Fix in the second, plain-CSS body rule (globals.css ~line 143): add
      `font-family: var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;`
      plus base typographic defaults on the same rule: `font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; font-feature-settings: "cv11", "ss01"` (drop the feature-settings if it changes glyphs oddly in dev — optional). Do NOT remove the `--font-geist-sans`/`--font-geist-mono` theme mappings or the `<body>` variable classes in `layout.tsx` (preserve env/var names and the `antialiased` class).
      Files: `src/app/globals.css`
      Verify: `npm run build` passes; then `npm run dev` and confirm in DevTools the computed `font-family` on `<body>` resolves to the Geist variable (a `__Geist_*` family), not Times/serif. Headings and body are visibly sans-serif.

- [ ] 2. Confirm/declare the mono stack where monospace is intended.
      These selectors already reference `var(--font-geist-mono),monospace`: `.recipient-editor`, `.format-example p`, `.studio-code`, `.code-block` (globals.css lines ~358, ~359, ~363, ~515). Leave them as-is (they are correct). Only add `font-family: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;` to any additional code/`<pre>`/`<code>` surface you find that currently inherits the (now-Geist-sans) body font but is meant to be monospace. If none beyond the four above, make no change here.
      Files: `src/app/globals.css` (only if an un-monospaced code surface is found)
      Verify: `npm run dev` — the landing-page studio code textarea (`.studio-code`), the read-only `.code-block` on detail pages, and the recipient editor render in a monospace face.

- [ ] 3. Verify Geist heavy weights render; add weight config only if needed.
      The CSS uses `font-weight` 600/700/750/800/900 (e.g. `.brand` 750, `.nav-eyebrow`/`.avatar` 800, `.plan-label` 900). Geist is a variable font, so `next/font/google` `Geist(...)` normally covers the full axis. In `npm run dev`, inspect a 900 element (e.g. `.plan-label`, `.workflow-step::before`) and an 800 element and confirm they render heavier than 700. If (and only if) they clamp to a lighter weight, add an explicit `weight`/axis config to the `Geist({...})` call in `layout.tsx` (e.g. `weight: ["400","500","600","700","800","900"]`) — otherwise leave `layout.tsx` unchanged.
      Files: `src/app/layout.tsx` (only if weights clamp)
      Verify: visual weight hierarchy is distinct across 600→900; `npm run build` still passes if layout.tsx was touched.

### A2. Professional type-scale pass

Design decision — a small, restrained scale (reasoning: the current CSS has ~126 font-size declarations at 6–10px which read as cramped/unprofessional; raise the floor to ~11px and give meta/body/headings consistent steps). Target tokens (apply as literal px values; do NOT introduce new CSS custom properties or restyle via Tailwind):

| Role | Old typical | New target | line-height | notes |
|---|---|---|---|---|
| micro/legal/footer fine print | 6–8px | **11px** | 1.5 | footer, copyright, tooltips, timestamps |
| eyebrow / uppercase label / table header | 7–10px | **11px** (letter-spacing ~.6–1px kept) | 1.3 | `.eyebrow`, `.nav-eyebrow`, `.app-table th`, `.*-stats span`, status/ticket pills |
| meta / caption / secondary | 8–10px | **12px** | 1.5 | `.stat-card > small`, `.campaign-name span`, `.muted`, card descriptions, `.field small` |
| body / form text / table cells | 10–11px | **14px** | 1.55 | `.app-table td`, `.field input/select/textarea`, `.page-heading p`, paragraph copy |
| small heading / card title | 13–15px | **15–16px** | 1.3 | `.form-section h2`, `.resource-copy h2`, `.plan-card h2`, `.data-panel-head h2` |
| section heading | 15–18px | **18–20px** | 1.25 | `.panel-heading h2`, `.thread-head h2`, `.settings-title h2` |
| page H1 / hero | clamp already OK | keep existing `clamp()` | existing | `.page-heading h1`, `.auth-story-copy h1`, `.hero-copy h1`, `.section-intro h2` — leave the big clamps |

Mapping rule of thumb to apply consistently: `6px→11`, `7px→11`, `8px→11` (labels/eyebrows/pills) or `→12` (captions/body-meta — use judgment per role above), `9px→12`, `10px→12` (meta) or `→14` (body/paragraph), `11px→12` (labels) or `→14` (inputs/body). Keep `12px`+ heading-ish sizes; nudge the 13–15px card/section headings up by 1–2px only where it improves hierarchy. NEVER go below 11px for any readable text.

- [ ] 4. Raise the global tiny-text floor across the shell, tables, forms, stat cards, pills and nav.
      Edit `src/app/globals.css` font-size values per the table/mapping above. This is ONE item covering the whole file (same change pattern repeated); it is large but a single coherent edit. Prioritized selectors to catch (non-exhaustive — sweep the whole file for `font-size:` ≤10px and 11px labels): `.nav-eyebrow`, `.nav-link`, `.account-copy strong/span`, `.sidebar-status`, `.sidebar-signout`, `.topbar-kicker`, `.topbar-title`, `.role-pill`, `.notification-*` (head/item/empty/footer), `.eyebrow`, `.page-heading p`, `.button`, `.attention-banner *`, `.stat-top`, `.stat-card > small`, `.chart-*`, `.bar-column small`, `.score-*`, `.campaign-name *`, `.status-badge`, `.empty-state *`, `.form-section > p`, `.field label/input/small`, `.data-panel-head *`, `.app-table th/td`, `.plan-card/.price/.feature-list`, `.admin-user-stats *`, `.review-* `, `.profile-*`, `.settings-*`, `.library-summary`, `.resource-* `, `.audience-* `, `.format-* `, `.landing-*`/`.studio-*`/`.editor-tabs`, `.auth-* `, all `.marketing-*`/`.hero-*`/`.feature-showcase`/`.public-*`/`.workflow-*`/`.trust-*`, `.create-modal-*`, wallet/cart/support/audit blocks (`.credit-pill`, `.wallet-*`, `.coupon-*`, `.cart-*`, `.support-*`, `.ticket-*`, `.audit-*`), and the `.center-pad`/`.skeleton`/`.code-block` state blocks. Keep letter-spacing on uppercase labels but reduce slightly if 11px looks spaced-out. Do not change colors, spacing, fl/grid layout, or weights in this item — font-size (and paired line-height where a block sets one) only.
      Files: `src/app/globals.css`
      Verify: `npm run build` passes. Then `npm run dev`: walk dashboard, a resource library, campaign/template/group detail, the two studios (audience builder + landing studio), services/pricing, login, and the public marketing pages. Confirm no text below ~11px remains and hierarchy reads cleanly.

- [ ] 5. Protect layout at the three breakpoints and in dark mode after the size bump.
      Larger type can overflow fixed-height bars and narrow columns. Specifically re-check and, if needed, adjust ONLY to prevent clip/overflow (keep changes minimal): the `.topbar` (72px) title/kicker/role-pill, the fixed-width `.desktop-sidebar` (256px) nav links + account card ellipsis, `.app-table` headers/cells (min-width 650px scroller), `.stat-card` numbers/captions (min-heights 138/124/108px), the two-column `.audience-builder-layout` / `.landing-studio` / `.settings-grid` / `.request-layout`, `.plan-card`/`.public-pricing-grid` cards, and `.status-badge`/pill min-widths. Review the existing media queries at **1050px**, **760px**, **540px** (and the 900/600px wallet/support ones) and bump any now-too-small overrides there to match the new floor (e.g. `.topbar-title` 12px→ at least 13–14px; `.library-summary p` 6px→11px). Nothing should wrap awkwardly, clip, or trigger horizontal scroll on the main shell.
      Files: `src/app/globals.css`
      Verify: `npm run dev`, resize across 1200 / 1050 / 900 / 760 / 600 / 540 / 375 px and toggle the theme (default is dark). No overflow/clipping in topbar, sidebar, tables, stat cards, studios, or pricing cards in either theme. `npm run build` passes.

---

## PHASE B — BUG HUNT / OVERHAUL

Each item is independently buildable. Items are ordered safe-first. "Note only" items must be documented, not code-changed.

- [ ] 6. Add missing `type="button"` to non-submit buttons (accessibility/correctness; prevents accidental form submits).
      13 files contain `<button>` without an explicit `type` (heuristic grep). Audit each and add `type="button"` to every button that is NOT the primary submit of a `<form>` (leave real submit buttons as `type="submit"` or add it explicitly). Known files: `src/app/dashboard/account/AccountSettings.tsx` (2), `src/app/dashboard/DashboardClient.tsx` (1), `src/app/dashboard/groups/create/page.tsx` (1), `src/app/dashboard/landing-pages/create/page.tsx` (1), `src/app/dashboard/logs/page.tsx` (1), `src/app/dashboard/services/CartPanel.tsx` (5), `src/app/dashboard/users/AccountActionButton.tsx` (1), `src/app/login/page.tsx` (3), `src/app/sign-in-simulation/page.tsx` (1), `src/components/ai-html-editor.tsx` (1), `src/components/dashboard-shell.tsx` (6), `src/components/marketing-nav.tsx` (1), `src/components/theme-toggle.tsx` (1). This is ONE item (same pattern across files). Read each button's context before editing — do not change a genuine submit button's semantics.
      Files: the 13 files listed above.
      Verify: `npm run build` passes; `npm run dev` smoke — toggling theme, opening the cart/notification menus, and clicking in-form helper buttons (e.g. "show password") no longer submits/navigates unexpectedly.

- [ ] 7. Verify the entitlement allowance-boundary decision is computed once pre-insert, and tighten if needed.
      The audit flagged `consumeAllowance` deciding monthly-vs-credit against POST-insert counts. Current code (`src/app/dashboard/campaigns/actions.ts` `launchCampaign`) already reads `getEntitlement` ONCE before insert and passes `entitlement?.remainingMonthly === 0` as the `useCustomCredit` flag into `consumeAllowance`, and `consumeAllowance` in `src/lib/entitlements.ts` no longer re-reads entitlement — so the boundary decision IS made on pre-insert state. CONFIRM this by reading both functions. If confirmed correct, make NO behavioral change; add a one-line comment at the `consumeAllowance(...)` call noting the decision uses the pre-insert `remainingMonthly` so a user exactly at the monthly limit does not wrongly burn a credit. If a real off-by-one remains (e.g. the `> 0` vs `>= 0` boundary or `recipientCount` typing lets a credit be consumed while monthly still covers it), fix it minimally so the decision is: consume a custom credit only when the monthly quota could NOT have covered this create (`remainingMonthly === 0`). Keep behavior otherwise identical. Do not change the quota numbers, the UTC-month window, or `refundAllowance`.
      Files: `src/app/dashboard/campaigns/actions.ts`, `src/lib/entitlements.ts` (comment/minimal-fix only)
      Verify: `npm run build` passes. Reason through the boundary on paper in the PR/notes: starter quota 2 → with `remainingMonthly` 1 before insert, no credit consumed; with 0 before insert and a custom credit present, exactly one credit consumed.

- [ ] 8. Resolve the redundant landing-pages SQL to remove canonical-source confusion (safe, docs/removal only).
      `supabase/migrations/create_landing_pages.sql` re-declares the `landing_pages` table already defined in `supabase/schema.sql` (both use `create table if not exists`, so it is harmless at runtime but confusing). It is NOT in the README's ordered migration list (README lists only `schema.sql` + the five dated migrations), so nothing references it as a required step. Resolve by deleting `supabase/migrations/create_landing_pages.sql` (the table lives in `schema.sql`, which is the canonical base). Before deleting, grep the repo to confirm no script/doc references this filename. If any reference exists, instead keep the file and add a top-of-file comment: `-- DEPRECATED: landing_pages is defined in schema.sql; this file is retained only for historical DBs and is not part of the ordered migration sequence.` Do not alter `schema.sql`.
      Files: delete (or annotate) `supabase/migrations/create_landing_pages.sql`
      Verify: `grep -rn "create_landing_pages" .` returns no code/doc references (outside this plan). `npm run build` unaffected (SQL is not compiled).

- [ ] 9. Fresh bug sweep of the three-phase runtime surface; fix what is safe, document the rest.
      Read for genuine NEW bugs (do not assume from the stale audit): broken/circular imports, unawaited promises, null-deref where `createAdminClient()` returns `null`, server actions missing auth/owner checks, wrong redirects, forms that don't validate, dead links / 404 routes. Focus files: `src/app/dashboard/campaigns/[id]/page.tsx` (note: campaign detail is fetched WITHOUT a `user_id` filter — confirm RLS covers read access for owners/admins and that a non-owner cannot load another user's campaign; if RLS does not cover it, add an owner/role check — otherwise document as RLS-protected), `src/app/dashboard/services/success/page.tsx`, `src/app/api/webhooks/stripe/route.ts`, `src/app/api/checkout/route.ts`, `src/app/api/track/[campaignId]/[email]/pixel/route.ts`, the public `src/app/[campaignName]/[groupName]/[slug]/page.tsx` and `src/app/l/[slug]/page.tsx`, `src/app/api/generate-content/route.ts`, and the server actions under `dashboard/*/actions.ts`. Fix only low-risk, clearly-correct issues (keep each fix minimal and targeted; no refactors/renames). For anything risky or needing product decisions, add it to a short "found, not fixed — needs decision" section in this plan file or in the PR notes rather than guessing.
      Files: as discovered (expect small, targeted edits only).
      Verify: `npm run build` passes; `npm run lint` clean; `npm run dev` smoke of the main authenticated flows (dashboard, create campaign, detail realtime, services/cart) shows no console errors introduced.

- [ ] 10. Re-check contrast after the type changes (quick accessibility win).
      The size bump can expose low-contrast muted text that was previously too small to notice (e.g. `.muted`, `#98a2b3` captions on white, dark-mode `--subtle`). Spot-check the now-larger meta text against WCAG AA (4.5:1 body / 3:1 large) using DevTools in both themes. Only adjust a color if it clearly fails AA for body-size text, and reuse existing palette tokens (`var(--subtle)`, `var(--ink)`) — do not introduce new colors or restyle layout. Note that full WCAG conformance needs manual AT testing; this is a targeted contrast pass only.
      Files: `src/app/globals.css` (only if a clear AA failure is found)
      Verify: `npm run dev` + DevTools contrast checker on sampled captions/labels in light and dark; `npm run build` passes.

---

## MUST NOT CHANGE (preserve exactly)
- Safety framing, admin-approval workflow, "credentials are NOT stored" text.
- Sandboxed preview iframes (`sandbox=""`) in dashboard previews.
- The `.env` file, all env var NAMES (`DASHSCOPE_*`, `STRIPE_*`, `SUPABASE_*`, `NEXT_PUBLIC_*`, SMTP_*).
- The `{{link}}` email token and its title-based tracking path substitution in `approveCampaign`.
- All DB columns, routes, server-action names, and form field names.
- The DeepSeek/DashScope AI request shape (`src/app/api/generate-content`).
- Stripe request shapes (`/api/checkout`, webhook) and tracking semantics.
- The semantic-class CSS system in `globals.css` (class names stay; only font-size/line-height and the font-family addition change). No new UI/CSS/animation libraries. No Tailwind-utility restyle of existing screens.

## ACCEPTED / NOTE-ONLY (do NOT "fix")
- Intentional `dangerouslySetInnerHTML` of user-authored `html_content` on the PUBLIC phishing landing routes (`l/[slug]`, `[campaignName]/[groupName]/[slug]`) — inherent to a phishing simulator; accepted risk. Dashboard previews correctly sandbox. Leave as-is.
- The UTC-calendar-month quota window in `entitlements.ts` — documented product simplification; out of scope here.
- Any audit P2 item already implemented in prior phases (see the "ALREADY FIXED" list at top).

## OPEN QUESTIONS / ASSUMPTIONS
- Assumed `npm run build` is the authoritative verification gate (no test runner exists). Manual `npm run dev` visual checks cover the type-scale/dark-mode/breakpoint items a headless build cannot.
- Assumed deleting `create_landing_pages.sql` is safe because it is absent from the README migration order and runtime uses `schema.sql`. Item 8 double-checks via grep before deleting and falls back to annotation if any reference is found.
- Font-feature-settings in item 1 is optional/cosmetic; drop it if it alters glyphs unexpectedly in dev.

---

## VERIFICATION NOTE (typography + bug-hunt pass)

Commands run (reviewer does NOT need to re-run):
- `rm -rf .next && npm run build` → **PASS** (Next.js 16.0.10, Turbopack; TypeScript + ESLint ran; all routes compiled). NOTE: the first build failed on a STALE `.next` cache that referenced a non-existent `src/app/failed/page.js`; removing `.next` and rebuilding fixed it. No such route exists in source (`grep -rn "/failed" src` is empty) — pre-existing cache artifact, not introduced by this pass.
- `npm run lint` → **PASS** (ESLint clean, no warnings/errors).
- Dev server (`npm run dev` on :3000) + headless Chromium screenshots of the four PUBLIC pages in light AND dark.

### Goal 1 — Typography (DONE)
- ROOT-CAUSE FIX: added `font-family: var(--font-geist-sans), …` plus base defaults (`font-size:14px; line-height:1.5; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; text-rendering:optimizeLegibility`) to the plain-CSS `body` rule in `globals.css`. Dropped the optional `font-feature-settings` (kept glyphs stable). Verified in a headless browser: `getComputedStyle(document.body).fontFamily` now resolves to `Geist, "Geist Fallback", ui-sans-serif, …` — the browser-default serif is gone.
- MONO: added `code, pre, kbd, samp { font-family: var(--font-geist-mono), ui-monospace, … }` so inline `<code>{{link}}` tokens and the styled-but-font-less `.app-table code`/`.format-guide code` render monospace. The four pre-existing mono surfaces (`.recipient-editor`, `.format-example p`, `.studio-code`, `.code-block`) were left intact.
- WEIGHTS: Geist is loaded as a variable font via `next/font/google` (full axis), so 600–900 render without clamping; `layout.tsx` left unchanged (confirmed visually in screenshots — hero/headings show distinct heavy weights).
- TYPE SCALE: raised the tiny-text floor across the whole file. Blanket mapping applied with a hard floor of 12px (6/7/8→11→then 9/10/11→12 so effective floor is 12px for readable UI text), 13→14. Then restored hierarchy on primary body surfaces: `.field input/select/textarea`→14, `.app-table td`/`strong`→13, `.auth-intro`→14, marketing feature/card copy→14, `.button`→13. `grep font-size:[6-9]px` and `1[01]px` now returns nothing below 12px. Breakpoint overrides (1050/760/540) re-checked: `.topbar-title` (12px @540), `.library-summary` (12px) etc. are all ≥12px; no media-query value left below the floor. No colors/spacing/layout/weights changed in the scale pass.
- LAYOUT: screenshots confirm topbar, pricing cards (4-up), feature grid, hero and login split-screen do not overflow/clip or trigger horizontal scroll in light or dark at 1280px.

### Goal 2 — Bug hunt / overhaul
FIXED:
- Entitlement boundary (`campaigns/actions.ts` `launchCampaign`): confirmed the monthly-vs-credit decision is computed ONCE from the PRE-insert `remainingMonthly` and passed as the `useCustomCredit` flag; `consumeAllowance` no longer re-reads. Behavior was already correct — added a clarifying 3-line comment only (a user exactly at the monthly limit with room left, remainingMonthly>0, burns NO credit; only remainingMonthly===0 consumes one). No behavioral change.
- Redundant SQL: deleted `supabase/migrations/create_landing_pages.sql` (table is canonical in `schema.sql` line 133; file absent from README migration order; only referenced by the audit doc). `git rm` used.
- `type` attributes: added explicit `type` to buttons across `theme-toggle.tsx`, `marketing-nav.tsx`, `dashboard-shell.tsx` (mobile-close/menu/backdrop/notification toggle+close = button; sign-out = submit), `CartPanel.tsx` (5, all button), `DashboardClient.tsx` (2 chart controls = button), `AccountSettings.tsx` (2 submit), `groups/create` + `landing-pages/create` (submit), `logs/page.tsx` ("Apply" submit), `AccountActionButton.tsx` (submit), `login/page.tsx` (auth-submit=submit, google+switch=button). Real submit buttons kept/made `type="submit"`.

FOUND — NOT A BUG / ACCEPTED (no change):
- Campaign detail (`dashboard/campaigns/[id]/page.tsx`) fetches without a `user_id` filter → RLS-PROTECTED: `schema.sql` "Users can crud own campaigns" (`auth.uid()=user_id`) + admin/manager/auditor SELECT policies; a non-owner `.single()` returns no row → `notFound()`. No owner check needed.
- All `createAdminClient()` call sites (activity, credits, checkout, entitlements, orders, users actions/page, support, billing-actions, logs) guard `if (!admin) …` — no null-deref.
- Stripe webhook/checkout, DeepSeek/DashScope generate-content, pixel route, public landing routes (`[campaignName]/.../slug`, `l/[slug]`) reviewed — request shapes, `{{link}}`, `sandbox=""`, tracking semantics, `dangerouslySetInnerHTML` all preserved and correct.
- Stray "N" circle bottom-left in dev screenshots = the **Next.js dev-tools indicator** (`<nextjs-portal>` shadow-DOM button at x≈22,y≈846). Dev-only; absent from production build. Not a code bug (matches prior review's non-reproduction — it lives in a shadow root).

### Screenshots (.agents/tasks/typography-shots/)
home-light.png, home-dark.png, features-light.png, features-dark.png, pricing-light.png, pricing-dark.png, login-light.png, login-dark.png

### Needs runtime verification by the user (unchanged from prior review.json)
- Apply `20261201_rename_admin_function.sql` in the Supabase SQL editor (app can't run DDL).
- Confirm single-`clicked`-per-visit tracking against a real sent campaign.
