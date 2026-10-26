<!--
=============================================================================
VERIFICATION NOTE (latest iteration — Space Grotesk / Inter / JetBrains Mono)
=============================================================================
Implemented the full font replacement per this plan (prior APPROVED review in
review.json/review.md covered an earlier Geist-only type-scale pass; the actual
files still used Geist, so this iteration executed Goal 1 from scratch). Two files
changed: src/app/layout.tsx + src/app/globals.css. The two findings in review.json
are both explicitly non-blocking, carried-over, DB/runtime items out of this
presentation scope (admin-rename DDL migration; single-click tracking runtime check)
— intentionally not touched here.

COMMANDS RUN (from repo root):
- `npm run lint`  -> PASS (exit 0, no warnings/errors)
- `rm -rf .next && npm run build` -> PASS (Next.js 16.4.3, TS+ESLint OK, 33 routes,
  fonts fetched via next/font/google with no errors)
- Dev server (`next dev`, :3000) started; public pages /, /features, /pricing,
  /login all returned HTTP 200.
- Playwright (chromium) full-page screenshots, 1440x1000 @2x, light + dark:
    .agents/tasks/font-shots/home-light.png     .agents/tasks/font-shots/home-dark.png
    .agents/tasks/font-shots/features-light.png  .agents/tasks/font-shots/features-dark.png
    .agents/tasks/font-shots/pricing-light.png   .agents/tasks/font-shots/pricing-dark.png
    .agents/tasks/font-shots/login-light.png     .agents/tasks/font-shots/login-dark.png
  Visual check: Space Grotesk on hero/section/card headings + prominent numerals;
  Inter on body/nav/buttons/labels/feature lists; no clipping/overflow on hero,
  nav, pricing cards, or two-column auth; dark mode colors intact.

GREP PROOFS (all pass):
  $ grep -n "font-family: var(--font-inter)" src/app/globals.css
    148:  font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  $ grep -n "var(--font-display)" src/app/globals.css
    170:  font-family: var(--font-display), var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  $ grep -nE "font-size: ?([0-9]|1[01])px" src/app/globals.css
    (no matches — floor of 12px holds everywhere incl. @media 1050/760/600/540)
  $ grep -rnE "font-geist|Geist" src/
    (no matches — Geist fully removed)
  $ layout.tsx Space_Grotesk weight = ["300","400","500","600","700"] (no 800/900)

OLD -> NEW font-size table (proves nothing < 12px; floor preserved):
  body base                               14px -> 15px
  .page-heading p:last-child              14px -> 15px
  .section-intro/.public-page-hero p      14px -> 15px
  .feature-showcase/.about/.public-feat p 14px -> 15px
  .auth-story-copy > p                    14px -> 15px
  .auth-intro                             14px -> 15px
  .button                                 13px -> 14px
  .auth-submit / .google-button           12px -> 14px
  .app-table td / .app-table strong       13px -> 14px
  .topbar-title                           15px -> 16px
  .panel-heading h2                       15px -> 18px
  .form-section h2                        14px -> 18px
  .data-panel-head h2                     14px -> 18px
  .resource-copy h2                       14px -> 18px
  .settings-title h2 (landing)            15px -> 18px
  .format-guide h2                        16px -> 18px
  .create-modal-head h2                   16px -> 18px
  .empty-state h3 / .center-pad h3        14/17px -> 18px
  .landing-ai-title h3                    14px -> 18px
  .plan-card h2                           16px -> 20px
  .public-pricing-grid h2                 16px -> 20px
  .feature-showcase h3/.about h2/.pub h2  15px -> 20px
  .workflow-step h2                       16px -> 20px
  .trust-control h2                       17px -> 20px
  .stat-card > strong                     25px -> 26px
  .library-summary span                   15px -> 18px
  secondary/meta lifted 12px -> 13px: .stat-card>small, .campaign-name strong/span,
    .account-copy strong/span, .resource-copy>p, .form-section>p, .field small,
    .score-panel>p, .plan-card>p, .public-pricing-grid>article>p, tooltip text,
    .support-message p, .empty-state p, .center-pad p, .create-modal-head p,
    .create-modal-choices button small, .landing-ai-title p, .studio-safety strong/p,
    .format-example p, .studio-code/.code-block (mono)
  micro-labels/eyebrows/badges/pills/uppercase meta: kept at 12px floor (min allowed).
  540px @media .topbar-title 12px, .library-summary 12px, .stat-card>strong 22px: all >= 12px.
  WEIGHT CAPS (display headings now Space Grotesk): .brand 750->700,
    .marketing-nav .brand 850->700, .create-modal-head h2 800->700,
    .landing-ai-title h3 800->700. (.plan-label 900 stays Inter.)
=============================================================================
-->

# Implementation Plan — Typography + Readability Pass (PhishSafe)

Scope: presentation-only. Two files change: `src/app/layout.tsx` (next/font wiring) and
`src/app/globals.css` (font-family mappings + readability sweep). No copy, routes, behavior,
DB, `{{link}}`, iframe sandboxing, or `.env` changes. Work on `main`, no worktree.

## Design decisions (made here, grounded in the code I read)

- **Fonts:** Headings in `Space_Grotesk`, body/UI in `Inter`, code/editor in **`JetBrains_Mono`**
  (switching mono away from `Geist_Mono`). Rationale: JetBrains Mono reads cleaner at small sizes in
  the dark editor panes (`.studio-code`, `.code-block`, `.recipient-editor`) than Geist Mono and pairs
  well with Inter; it keeps a single, consistent mono everywhere. `Geist`/`Geist_Mono` imports are then
  fully removable.
- **Why the user still finds text "too small" after the 12px floor:** a grep proves it — there are
  **174 declarations at exactly `font-size: 12px`** and only 3 at 13px, 18 at 14px, 8 at 15px. Body is
  14px. The prior pass clamped nearly all secondary text, labels, captions, table cells, nav, badges,
  meta, and even some section descriptions *down to the 12px floor*, collapsing the hierarchy so almost
  everything reads as the same small size. The fix is not "raise the floor to 12" (already done) but
  **lift the whole scale and restore hierarchy**: body→15px, meta/caption→13px, micro-labels/eyebrows→12px,
  nav/buttons→14px, headings up a step. There are **no sub-12px sizes left** (grep for `[789]px`/`1[01]px`
  returns nothing), so the "NO text below 12px" rule is already met and must be *preserved* — the work is
  lifting the mass of 12px text, not hunting single-digit sizes.
- **Heading application is class-scoped, not a global `h1,h2,h3` rule.** globals.css has no bare
  `h1{}`/`h2{}` selector; headings are styled via classes (`.page-heading h1`, `.panel-heading h2`,
  `.resource-copy h2`, `.plan-card h2`, etc.). Decision: add Space Grotesk via a **scoped selector list**,
  NOT a global `h1,h2,h3`. This deliberately leaves the two standalone Tailwind-utility pages
  (`src/app/sign-in-simulation/page.tsx`, `src/app/training-result/page.tsx`) untouched — they are fake
  third-party login / result screens and must not inherit the product font. (The task mentions `h1,h2,h3`;
  I include real heading tags via their wrapper classes instead, to avoid restyling the simulation pages.)
- **Weight cap:** Space Grotesk ships 300–700 only. Every heading currently at `font-weight: 800/900`
  that becomes a Space Grotesk heading must drop to `700`. Non-heading 800/900 (eyebrows, pills, badges,
  nav, table th, links) stays on Inter and keeps its weight (Inter is variable, 800/900 valid).

## next/font config (exact)

In `src/app/layout.tsx`, replace the Geist imports/instances with:

```ts
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});
```

`<body>` className becomes:
`` `${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased` ``
Keep `antialiased`, keep `suppressHydrationWarning` on `<html>`, keep `ThemeProvider` untouched.

## Font-family mappings (exact)

`@theme inline` block (globals.css ~lines 9–10): change to
```
--font-sans: var(--font-inter);
--font-mono: var(--font-mono);
--font-display: var(--font-space-grotesk);   /* new line */
```

`body` rule (~line 147): font-family becomes
`var(--font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;`
Keep the three smoothing/rendering declarations.

Every `var(--font-geist-mono)` occurrence → `var(--font-mono)`. Locations (all keep `, monospace` fallback,
all stay mono): `code,pre,kbd,samp` (~156); `.recipient-editor` (~369); `.format-example p` (~370);
`.studio-code` (~374); `.code-block` (~526). Grep `font-geist` after editing — expect **zero** matches.

Add Space Grotesk to headings only, via one scoped rule (place after the body/base block). Use
`var(--font-display)` with the Inter stack as fallback, and cap weight context where set inline:
```
.page-heading h1, .panel-heading h2, .plan-card h2, .resource-copy h2, .form-section h2,
.data-panel-head h2, .settings-title h2, .format-guide h2, .landing-settings .settings-title h2,
.create-modal-head h2, .section-intro h2, .public-page-hero h1, .feature-showcase h3,
.about-grid h2, .public-feature-grid h2, .public-pricing-grid h2, .workflow-step h2,
.trust-control h2, .hero-copy h1, .auth-story-copy h1, .auth-form-wrap > h2, .empty-state h3,
.center-pad h1, .center-pad h3, .product-body h3, .marketing-cta h2, .trust-banner h2,
.review-decision-bar h2, .thread-head h2, .cart-drawer h2, .profile-identity h2,
.payment-success h1, .ai-html-editor h3 /* .landing-ai-title h3 */,
.stat-card > strong, .score-ring strong, .price strong, .public-pricing-grid strong,
.brand, .marketing-nav .brand, .topbar-title {
  font-family: var(--font-display), var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}
```
(Confirm each selector against the file when editing; the AI-editor heading is `.landing-ai-title h3`.)

## 800/900 → 700 caps (headings that moved to Space Grotesk)

Only cap selectors now using `--font-display`. Audit and set to `700`:
- `.brand` / `.marketing-nav .brand` — currently `750`/`850` → `700`.
- `.plan-label` is a ribbon **label**, stays Inter → leave `900`.
- Any `.stat-card > strong`, `.score-ring strong`, `.price strong` with no weight set inherit body;
  if a display heading selector elsewhere sets `800`/`900` AND is in the Space Grotesk list, set `700`.
Leave on Inter (do NOT cap): `.eyebrow`, `.nav-eyebrow`, `.topbar-kicker`, all `.status-badge`,
`.role-pill`, `.app-table th`, `.text-link`, `.feature-showcase small`, `.plan-label`, chart/stat
micro-labels, buttons. These keep 700/800/900 as-is.

## Letter-spacing / line-height refinement (premium feel)

- Large display (hero/page/auth/section/center-pad h1): keep existing negative tracking, ensure
  line-height in 1.05–1.15 (hero `.hero-copy h1` already `.98`→raise to `1.05`; `.auth-story-copy h1`
  `1.01`→`1.08`; `.page-heading h1` `1.12` ok; `.section-intro h2` `1.05` ok).
- Subheads (panel/card h2/h3): line-height ~1.25–1.3, letter-spacing -0.2px to -0.3px.
- Body/paragraph: line-height 1.5–1.65 (body base `1.5`→`1.55`).
- Heading weights land at 500/600/700 (no 400 display headings, no 800+).

## Readability sweep — OLD → NEW size table

Apply across globals.css. "12px (meta)" = secondary/caption/table/badge text; "12px (micro)" =
eyebrow/uppercase/pill/stat-caption. Lift by role, not blanket, to rebuild hierarchy:

| Role / example selectors | OLD | NEW |
|---|---|---|
| Body base (`body`) | 14px | **15px** |
| Primary readable paragraphs: `.page-heading p:last-child`, `.auth-story-copy > p`, `.auth-intro`, `.hero-copy > p`, `.section-intro > p:last-child`, `.public-page-hero > p:last-child`, `.feature-showcase p`, `.about-grid p`, `.public-feature-grid p` | 14px/15px | **15px** |
| Nav links `.nav-link`, buttons `.button`, `.button.primary/secondary` | 14px/13px | **14px** |
| `.marketing-nav nav a`,`.marketing-login` | 17px | keep 16–17px |
| Secondary/meta/caption now at 12px (card subtitles, `.campaign-name span`, `.account-copy span`, `.stat-card > small`, `.resource-copy > p`, `.muted`, tooltips, notification body, `.form-section > p`, `.field small`, `.score-panel > p`, support message text, cart item meta) | 12px | **13px** |
| Table cells `.app-table td`, `.app-table strong` | 13px | **14px** |
| Micro-labels / eyebrows / uppercase: `.eyebrow`,`.nav-eyebrow`,`.topbar-kicker`, `.app-table th`, `.status-badge`,`.role-pill`, `.stat-top`, chart labels, `.hero-badge`, `.trust-strip`, `.feature-showcase small`, stat captions, `.validation-pill`, `.ticket-status` | 12px | **12px** (keep floor; rely on letter-spacing + weight for legibility) |
| Panel/card headings `.panel-heading h2`, `.form-section h2`, `.data-panel-head h2`, `.resource-copy h2`, `.create-modal-head h2`, `.landing-* settings h2` | 14px/15px | **18px** |
| `.plan-card h2`, `.public-pricing-grid h2`, `.feature-showcase h3`, `.workflow-step h2`, `.trust-control h2`, `.about-grid h2` | 15px/16px/17px | **20px** |
| `.topbar-title` | 15px | **16px** |
| Big numbers `.stat-card > strong` | 25px | **26px** |, `.score-ring strong` 31px keep, `.price strong` 29px keep, `.wallet-card strong`/`.public-pricing-grid strong` 28px keep |
| `.empty-state h3`, `.center-pad h3` | 14px/17px | **18px** |
| `.auth-form-wrap > h2` | 28px | keep (≥) |
| `.library-summary span` | 15px | **18px** |
| Skeleton `.skeleton-line.sm` (decorative, not text) | 9px | leave — not readable text; it's a shimmer block |

Rule: after edits, grep `font-size: ?([0-9]|1[01])px` in globals.css → **zero** matches (floor held).
Do not raise the two Tailwind-utility simulation pages (they use `text-2xl/3xl/6xl`, out of scope).

## Layout-risk spots to watch (larger text → check overflow/spacing)

1. `.topbar` height 72px / 70px(≤760) / title 16px + `.topbar-title` ellipsis — verify no clipping; bump
   mobile `.topbar-title` 540px rule from `12px` to **12px floor stays** but confirm fits.
2. `.nav-link` min-height 44px with 14px text — ok, verify active-state padding.
3. Two-column studios (`.landing-studio`, `.audience-builder-layout`, `.request-layout`,
   `.support-layout`) — larger h2 (18–20px) in headers: check header min-heights don't clip.
4. `.app-table` — td now 14px, th 12px; may need `padding` bump (td `14px 18px` → ok; th `10px 18px`).
   Verify `min-width: 650px` still scrolls, not wraps.
5. `.stat-card` min-height 138px/124px(≤540) with 13px caption — verify text fits; `.stat-top` 12px ok.
6. `.plan-card`/`.public-pricing-grid` — h2 20px + `.price strong` 29px: check card padding 22px/25px.
7. `.resource-card` min-height 200/210 with h2 20px + 13px subtitle — check 3-col→2-col→1-col.
8. Marketing hero clamp `clamp(48px,6vw,78px)` keep; ≤1050 `.auth-story-copy h1` 43px keep; ≤760
   `.hero-copy h1` 49px keep. Don't shrink these.
9. Badges/pills (`.status-badge` min-width 66px, `.role-pill` height 30px) — 12px text unchanged, ok.
10. `@media (max-width:540px)` block: `.topbar-title { font-size: 12px }`, `.library-summary span/p
    { font-size: 12px }` — keep at **12px floor** (do not drop below); `.stat-card > strong` 22px keep.

## Build / test commands (from package.json)

No test runner exists (`scripts`: dev, build, start, lint, seed). Verification = typecheck + lint + build.

---

## Ordered items

- [ ] 1. Rewire fonts in `src/app/layout.tsx`: replace `Geist`/`Geist_Mono` with `Space_Grotesk`
      (weights 300–700), `Inter`, `JetBrains_Mono`; assign `--font-space-grotesk`, `--font-inter`,
      `--font-mono`; put all three variable classes + `antialiased` on `<body>`. Remove Geist imports.
      Files: `src/app/layout.tsx`
      Verify: `npx tsc --noEmit` passes; `grep -rn "Geist" src/app/layout.tsx` returns nothing.

- [ ] 2. Update font plumbing in `src/app/globals.css`: `@theme inline` (`--font-sans`→Inter,
      `--font-mono`→`--font-mono`, add `--font-display`→Space Grotesk); `body` font-family→Inter stack
      (keep smoothing); replace every `var(--font-geist-mono)` with `var(--font-mono)`.
      Files: `src/app/globals.css`
      Verify: `grep -c "font-geist" src/app/globals.css` → `0`.

- [ ] 3. Apply Space Grotesk to the scoped heading selector list (section "Font-family mappings"); do
      NOT add a global `h1,h2,h3` rule. Then cap every heading in that list from 800/900 to 700 per the
      "800/900 → 700 caps" section (leave eyebrows/pills/badges/nav/th/labels on Inter at their weight).
      Files: `src/app/globals.css`
      Verify: `npm run build` compiles; load `/` and a dashboard page in the running app — headings render
      in Space Grotesk, body/nav/labels in Inter, editor panes in JetBrains Mono, no weight fallback.

- [ ] 4. Readability sweep: apply the OLD→NEW size table (body→15, meta→13, table td→14, nav/buttons→14,
      panel h2→18, card h2→20, etc.), lifting by role to restore hierarchy; keep every micro-label at the
      12px floor. Apply the letter-spacing/line-height refinements. Do not touch the two Tailwind-utility
      simulation pages.
      Files: `src/app/globals.css`
      Verify: `grep -nE "font-size: ?([0-9]|1[01])px" src/app/globals.css` → **zero** matches (12px floor
      held, including inside all `@media` blocks).

- [ ] 5. Responsive + dark-mode guard: audit the `1050 / 760 / 600 / 540 / 900` media queries so no
      font-size drops below 12px and larger text doesn't overflow (topbar title, nav, two-column studios,
      tables, stat/plan/resource cards, marketing hero per "layout-risk spots"). Adjust padding/
      line-height where text now crowds; preserve all breakpoints and the `.dark` rules.
      Files: `src/app/globals.css`
      Verify: `npm run build` passes; `npm run lint` clean; manually resize to 1050/760/600/540 in the
      running app (light + dark) — no clipped headings, no horizontal overflow, nothing below 12px.

- [ ] 6. Final full verification.
      Files: none (verification only)
      Verify: `npx tsc --noEmit` && `npm run lint` && `npm run build` all succeed; final
      `grep -nE "font-size: ?([0-9]|1[01])px" src/app/globals.css` returns nothing; `grep -rn
      "font-geist\|Geist" src/` returns nothing.

## MUST NOT change

- No copy/wording/text content; no `{{link}}`/`{{...}}` tokens.
- No routes, server actions, API handlers, DB schema/fields, Supabase/Stripe/Nodemailer logic.
- Keep `sandbox=""` on every preview iframe; do not touch iframe attributes.
- Do not touch `.env`, `.env.local`, or any secret.
- Keep the semantic-class CSS system — no Tailwind-utility restyle of app components, no new UI libs
  beyond `next/font`.
- Do NOT restyle the standalone Tailwind-utility pages `src/app/sign-in-simulation/page.tsx` and
  `src/app/training-result/page.tsx` (fake login / result screens — intentionally not the product font).
- Do not lower any font-size below 12px anywhere, including media queries.
- Do not change `ThemeProvider` config or `suppressHydrationWarning`.
- Space Grotesk weights only 300–700 — never request 800/900 for it.

## Gaps / assumptions

- No test framework in the repo; verification relies on `tsc`, `eslint`, `next build`, and manual
  visual/responsive checks. Noted, proceeding — this is a CSS/presentation task.
- Mono switched to JetBrains Mono (decision above). If the reviewer prefers keeping Geist Mono, only the
  layout import + `--font-mono` source change; the rest of the plan is unaffected.
