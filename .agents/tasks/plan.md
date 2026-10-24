# Implementation Plan — PhishSafe: Real Purchases, Terminology, Visual Polish

This plan covers three goals against the real codebase (Next.js 16 App Router, TypeScript, Supabase/Postgres, Tailwind v4, semantic-class CSS in `src/app/globals.css`). No test framework exists; **verification = `npm run lint` and `npm run build` must both pass** (lint currently exits 0, build must stay green). Clean up any scratch files.

## Facts established by reading the code

- `orders` table (from `supabase/migrations/20261021_roles_approvals_billing.sql`) columns ONLY:
  `id uuid pk`, `user_id uuid`, `stripe_session_id text unique`, `plan text check in ('starter','growth','enterprise')`, `amount_cents integer`, `currency text default 'eur'`, `status text check in ('pending','paid','cancelled','refunded')`, `created_at timestamptz`.
  Problems for this task: (1) the `plan` CHECK does NOT allow `'single'`, which the checkout route and `plans.ts` both send; (2) there is no column to distinguish one-time vs monthly billing or to track one-time credit consumption.
- `campaigns` columns: `id, user_id, title, subject, body_html, status (draft|pending_approval|sent|rejected), created_at, template_id, group_id, landing_page_url, requested_at, approved_at, approved_by, rejection_reason`. `created_at` exists and is reliable → used for "campaigns this period".
- `src/app/api/checkout/route.ts` sends `metadata[user_id]`, `metadata[plan]`, mode `payment` for `single` else `subscription`, success_url `…/dashboard/services/success?session_id={CHECKOUT_SESSION_ID}`. **Do not change its request shape.**
- `success/page.tsx` is a static component — verifies nothing, records nothing.
- `launchCampaign` in `src/app/dashboard/campaigns/actions.ts` inserts `pending_approval` with no paid/allowance check.
- Admin-approval flow (`approveCampaign`/`rejectCampaign`) is correct and must stay unchanged. Enforcement goes at creation time only.
- Supabase server client: `@/lib/supabase/server` `createClient()` (async). RLS: users can only see their own `orders` (policy "Users view own orders"). The success page runs as the user, so an authenticated insert/upsert into `orders` for the user's own row is allowed by the existing `for all`-style policy? NO — orders only has a SELECT policy. Inserts must use the **service-role client** (`SUPABASE_SERVICE_ROLE_KEY` exists per README). Check `src/lib/supabase/` for an existing admin/service client; if none, create one.

## MUST NOT CHANGE (hard constraints)
- DB column names, table names, route paths (`/dashboard/services`, `/dashboard/groups`, `/dashboard/requests`, etc.), server-action function names (`launchCampaign`, `approveCampaign`…), form field names (`title`, `templateId`, `groupId`, `landingPageUrl`, `plan`), and the `{{link}}` token.
- Checkout route request shape and env var names (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DASHSCOPE_*`, `DEEPSEEK_MODEL`, SMTP_*, `NEXT_PUBLIC_*`).
- Safety framing: admin approval, "credentials NOT stored", sandboxed preview iframes (`sandbox=""` / srcDoc preview in builders), `.env` file.
- Existing builder/studio layouts (`landing-pages/create`, `templates/create`, their `[id]/edit`) — terminology text may change, structure/iframe must not regress.
- Do NOT edit existing migration files. New DDL goes in a NEW migration file.

---

## GOAL 1 — Make purchases real + enforce allowance

**Entitlement model (confirmed with user):**
- one-time `single` = exactly 1 campaign credit (consumable, never resets).
- monthly `starter`=2, `growth`=10, `enterprise`=unlimited campaigns per billing month.
- "Campaigns used this period" = **count of rows in `campaigns` for the user with `created_at >= start of current calendar (UTC) month`.** (Simplest correct definition; documented. Rejected campaigns still count as a used attempt — acceptable and simplest; document this.)
- Monthly quota = quota of the user's **active monthly subscription** (most recently purchased monthly order within the current month window; see note). `remaining_monthly = max(0, quota - used_this_month)` (enterprise = Infinity).
- One-time credits: `credits_remaining = count(paid single orders) - count(consumed single orders)`. Add to allowance. Consumed when a campaign is created and no monthly allowance was available (prefer consuming monthly quota first, then a one-time credit).
- `can_create = remaining_monthly > 0 OR credits_remaining > 0`.

**Migration (NEW file, full DDL):** add a billing-type + credit-consumption model to `orders` without breaking existing rows, and widen the plan CHECK to include `single`.

Columns to use on `orders`: existing `user_id, plan, amount_cents, currency, status, stripe_session_id, created_at` PLUS new `billing_type text` ('one-time'|'monthly'), `period_start timestamptz` (for monthly, start of the paid month; nullable), `credit_consumed boolean default false` (only meaningful for one-time orders — marks a single-credit as used).

- [ ] 1. **New migration SQL** `supabase/migrations/20261101_orders_entitlements.sql`:
      Widen plan CHECK to include `single`; add `billing_type`, `period_start`, `credit_consumed` columns (all `add column if not exists`); backfill `billing_type` from plan (`single`→one-time else monthly); add index on `(user_id, status)`. Include a header comment: "Run this in the Supabase SQL editor before testing."
      Files: `supabase/migrations/20261101_orders_entitlements.sql`
      Verify: file parses as valid Postgres DDL (review by hand; the app can't run DDL). Note in final report: user MUST run it in Supabase SQL editor.

- [ ] 2. **Service-role Supabase client.** Check `src/lib/supabase/` for an existing admin client. If absent, add `src/lib/supabase/admin.ts` exporting `createAdminClient()` using `@supabase/supabase-js` `createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession:false } })`. Guard: if `SUPABASE_SERVICE_ROLE_KEY` missing, return null and callers treat as "no verified orders".
      Files: `src/lib/supabase/admin.ts` (new, only if none exists)
      Verify: `npm run build` passes.

- [ ] 3. **Entitlements library** `src/lib/entitlements.ts`: pure + data functions.
      - `PLAN_QUOTA: Record<PlanId, number>` = { single: 1 (as credit, not monthly), starter: 2, growth: 10, enterprise: Infinity }.
      - `async getEntitlement(userId): { plan: PlanId|null, planName, billing, monthlyQuota:number, usedThisMonth:number, remainingMonthly:number, oneTimeCredits:number, canCreate:boolean }` reading `orders` (service-role) + counting `campaigns` since UTC month start. Handle no-orders / Stripe-not-configured gracefully (returns canCreate:false, plan:null).
      - `async consumeAllowance(userId)`: decide whether monthly quota covers it; if not, mark one oldest unconsumed paid `single` order `credit_consumed=true`. Idempotency not required here (called once inside launchCampaign after the allowance check).
      Files: `src/lib/entitlements.ts` (new)
      Verify: `npm run build` passes.

- [ ] 4. **Payment verification on success page.** Convert `src/app/dashboard/services/success/page.tsx` to an async server component. Read `searchParams.session_id`; if present and `STRIPE_SECRET_KEY` set, `GET https://api.stripe.com/v1/checkout/sessions/{id}` with bearer key; confirm `payment_status==='paid'` OR `status==='complete'` AND `metadata.user_id === currentUser.id`; then UPSERT `orders` (onConflict `stripe_session_id`) via service-role client: `{ user_id, plan, billing_type (one-time if plan==='single' else monthly), amount_cents (from session.amount_total), currency, status:'paid', stripe_session_id, period_start (month start for monthly) }`. Idempotent via unique `stripe_session_id`. On any failure (no key, unpaid, user mismatch, Stripe error) DO NOT grant — render a graceful "could not confirm / test mode" message. Keep the existing success visual + CTA, add entitlement summary.
      Files: `src/app/dashboard/services/success/page.tsx`
      Verify: `npm run build` passes; manual: visiting without session_id shows graceful state, not a crash.

- [ ] 5. **Enforce allowance in `launchCampaign`.** Before the insert, call `getEntitlement(user.id)`; if `!canCreate` throw `Error("You've used all campaigns included in your plan this month. Upgrade or buy a single campaign to continue.")` and do not insert. After a successful insert, call `consumeAllowance(user.id)`. Do NOT touch `approveCampaign`/`rejectCampaign`. Keep redirect behavior.
      Files: `src/app/dashboard/campaigns/actions.ts`
      Verify: `npm run build` passes. Manual: with no orders, submitting the create form throws the clear error and creates no campaign row.

- [ ] 6. **Surface entitlement state in UI.**
      - `services/page.tsx` (Billing): show a banner with current plan + `remainingMonthly` + `oneTimeCredits` or "No active plan — purchase to create campaigns."
      - `campaigns/create/page.tsx`: fetch entitlement; if `!canCreate`, replace the form with an empty-state panel linking to `/dashboard/services` ("Purchase a plan to create campaigns"); else show "X campaigns remaining this month" above the form.
      - `DashboardClient.tsx` create entry points: leave as-is (enforcement + create page handle the gating).
      Files: `src/app/dashboard/services/page.tsx`, `src/app/dashboard/campaigns/create/page.tsx`
      Verify: `npm run build` passes.

---

## GOAL 2 — Terminology (display-string rename ONLY)

Standard CTA chosen: **"Get started"** (used everywhere a public CTA was "Start testing"). "New request" → **"New Campaign"**. "Plans & billing"/"Services" → **"Billing"**. "Approvals" → **"Pending Campaigns"** (clearer, standard). "Audiences"/"Audience*" → **"Groups"/"Recipient group"**. Keep Templates = "Email Templates", "Landing Pages", "Campaigns", Account.

### Terminology mapping table (old → new, per file)

| File | Old string | New string |
|---|---|---|
| `components/dashboard-shell.tsx` | nav "New request" | "New Campaign" |
| | nav "Approvals" | "Pending Campaigns" |
| | nav "Plans & billing" | "Billing" |
| | nav "Audiences" | "Groups" |
| | nav "Account management" | "Users" (admin) |
| | eyebrow "Workspace"/"Build" | keep (generic, fine) |
| | topbar-kicker "Security awareness workspace" | "Security awareness platform" |
| `components/marketing-nav.tsx` | CTA "Start testing" | "Get started" |
| `components/resource-library.tsx` | audience eyebrow "Audience library" / title "Authorized audiences" / desc | "Groups" / "Recipient groups" / "Organize recipients into consented groups for targeted simulations." |
| | page eyebrow "Experience library" / desc "learning moments" | "Landing Pages" / "Pages recipients see after a simulated click." |
| | template eyebrow "Content library" | "Email Templates" |
| `dashboard/groups/page.tsx` | createLabel "New audience" | "New Group" |
| `dashboard/groups/create/page.tsx` | eyebrow "Audience builder" / h1 "Create an authorized audience" / button "Create audience (n)" | "Groups" / "Create a recipient group" / "Create group (n)" |
| `dashboard/templates/page.tsx` | createLabel/label "New template" | "New Email Template" |
| `dashboard/templates/create/page.tsx` | eyebrow "Email studio" | "Email Template" |
| `dashboard/landing-pages/page.tsx` | createLabel "New landing page" | "New Landing Page" (fine as-is) |
| `dashboard/landing-pages/create/page.tsx` | eyebrow "Landing-page studio" / h1 "Build a learning moment" | "Landing Page" / "Create a landing page" |
| `dashboard/campaigns/create/page.tsx` | eyebrow "Campaign builder" / h1 "Request a new simulation" | "New Campaign" / "Create a campaign" |
| `dashboard/requests/page.tsx` | eyebrow "Administrator" / h1 "Campaign approvals" | "Pending Campaigns" / "Pending campaigns" |
| `dashboard/services/page.tsx` | eyebrow "Services" / h1 "Choose your protection plan" | "Billing" / "Plans & billing" |
| `dashboard/DashboardClient.tsx` | "Request campaign" / "New request" / "Create request" | "New Campaign" / "New Campaign" / "Create a campaign" |
| `app/page.tsx` | "learning moment" copy | "a coaching moment" (keep meaning, drop fluff) |
| `pricing/page.tsx` | "Custom learning pages" | "Custom landing pages" |

(Keep route paths and the `kind`/`createHref` props unchanged. The `resource-library` `kind="audience"` prop is an internal key — do NOT rename the prop value, only displayed strings.)

- [ ] 7. **Apply the terminology map above.** Edit each listed file changing ONLY user-facing display strings per the table. Do not touch props, routes, action names, or form fields.
      Files: all files in the table.
      Verify: `npm run lint` && `npm run build` pass; grep confirms "Start testing", "New request", "Plans & billing", "Choose your protection", "Build a learning moment", "Landing-page studio", "Email studio" no longer appear in `src/`.

---

## GOAL 3 — Visual polish (topbar priority)

- [ ] 8. **Redesign the dashboard topbar.** In `dashboard-shell.tsx` keep all behavior (mobile toggle, notifications dropdown, theme toggle, role pill, greeting). Improve markup grouping if needed (keep existing class names; may add BEM-style modifiers). In `globals.css` restyle `.topbar` (cleaner height, border, subtle shadow, better blur), `.topbar-left/.topbar-actions` (alignment/spacing), `.topbar-kicker/.topbar-title` (clearer hierarchy, maybe breadcrumb-like), `.role-pill` (modern pill, better dark-mode), icon buttons + theme toggle (consistent sizing/hover). Ensure dark mode (`.dark .topbar` etc.) and the 760px/540px responsive rules still hold (role-pill hidden on mobile, kicker hidden, mobile-menu visible).
      Files: `src/components/dashboard-shell.tsx`, `src/app/globals.css`
      Verify: `npm run build` passes. Manual: topbar looks polished in light + dark, responsive at <760px (mobile menu button shows), notifications/theme/role all functional.

- [ ] 9. **Light consistency polish pass** on dashboard page headings/spacing (`.page-heading`, `.eyebrow`, `.content-page` spacing) WITHOUT redesigning pages or touching builder/studio iframe layouts. Keep semantic-class CSS (no Tailwind utility conversion).
      Files: `src/app/globals.css` (and only trivial className tweaks if required)
      Verify: `npm run build` passes; builders (`landing-pages/create`, `templates/create`) still render preview iframes unchanged.

---

## Final verification (whole task)
- `npm run lint` → exit 0.
- `npm run build` → succeeds with no type errors.
- Report to user: **run `supabase/migrations/20261101_orders_entitlements.sql` in the Supabase SQL editor** (app cannot run DDL). Without it, `single` purchases and credit tracking will fail the plan CHECK.
