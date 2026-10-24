# Implementation Plan — DeepSeek-only AI, generic wording, studio polish, email-template AI

This plan covers all four parts of the task. It is ordered by dependency: the shared AI lib and API route
(items 1–3) must land before the UI changes that call them. Every item leaves the codebase buildable.

Verification baseline (no test framework exists in this repo — do NOT add one):
- Build: `npm run build` (Next.js 16 production build; this is the real compile/type-check gate).
- Lint: `npm run lint` (eslint).
- There are no unit tests; verification = build passes + lint passes + manual reasoning about the changed file.

## Key decisions (recorded rationale)

1. **AI-lib rename → `src/lib/ai.ts`, exported fn `generateHtmlWithAi`.** The task wants nothing in UI/routes to
   say "deepseek". Renaming the module and its export to provider-neutral names achieves that while keeping the
   DeepSeek/DashScope implementation underneath unchanged. Env var names stay `DASHSCOPE_API_KEY` /
   `DASHSCOPE_BASE_URL` / `DEEPSEEK_MODEL` (task requires this). Rationale: a single rename localizes "DeepSeek"
   to internal comments only; all imports get updated in the same item so the build never breaks.

2. **Single generalized API route with a `kind` param (preferred over a second route).** Generalize
   `/api/generate-landing-page` → `/api/generate-content` accepting `kind` = `"landing"` | `"email"`. Rationale:
   one auth gate, one size cap, one error-surfacing path, zero duplication; the only per-kind difference is the
   system instruction. Both studios POST to the same route with a `kind` field.

3. **Video handling: accept images, silently skip video.** Only the image-capable DeepSeek path remains. The route
   already filters to `image/*` before sending; we keep accepting `image/*,video/*` validation BUT ignore video
   bytes (don't send them) and the landing UI's file input accepts `image/*` only, with a small note. Rationale:
   rejecting outright would regress the user who uploads a mixed set; skipping is the existing, tested behavior.
   Simpler alternative (reject video with an error) was rejected because the current code already skips and the
   user tested that path live.

4. **Tracking token to preserve: `{{link}}`.** `src/app/dashboard/campaigns/actions.ts` does
   `template.body_html.replace(/{{link}}/g, trackingLink)`. Generated emails MUST contain `{{link}}` in the primary
   CTA or the campaign flow breaks. The email system instruction explicitly requires exactly `{{link}}`.

## MUST NOT CHANGE (safety / integrity invariants)
- The sandboxed preview iframe `sandbox=""` on the landing studio preview.
- Safety/awareness framing injected by the app and seed content: "SECURITY AWARENESS TRAINING SIMULATION" markers,
  "No passwords or private information were stored" / "credentials are NOT stored" guarantees, the PhishSafe
  learning-moment copy in `scripts/seed-default-content.mjs` (do not touch the seed file).
- The `.env` file (real secrets, git-ignored) — never read or write it.
- Env var NAMES: `DASHSCOPE_API_KEY`, `DASHSCOPE_BASE_URL`, `DEEPSEEK_MODEL`.
- Save flows: `createLandingPage` (landing-pages/actions.ts), `createTemplate`/`updateTemplate`
  (templates/actions.ts). AI generation must NOT auto-save — human-in-the-loop only.
- The 401 auth gate, the 20MB total-size cap, image/video mime validation, exact-error surfacing in the API route.
- The `{{link}}` placeholder convention and the `name` / `subject` / `bodyHtml` form field names + `body_html`
  DB column for templates.

## System-instruction wording (exact intent, both kinds include the no-disclaimers directive)

Shared preamble (keep the existing self-contained/inline-CSS/no-external-resources/no-exfil/no-real-credentials
rules and the "ONLY raw HTML, no code fences" rule). Add, for BOTH kinds, the user-requested lines (already present
in deepseek.ts for landing):
- "Make the page as realistic as possible and as close to the original as possible, so this is a true phishing
  simulation."
- "Never add disclaimers about this being a test or simulation. Do not add any 'this is a test' notice,
  watermark, or educational banner inside the generated HTML — the realism is required for the training to work."

Landing `kind`: "...building a safe, educational phishing-simulation **landing page**..." (current wording).

Email `kind`: "...building a safe, educational phishing-simulation **training email**... Produce email-safe HTML:
inline CSS only, a table-based/width-constrained layout (max-width ~600px), no `<script>`, no external CSS/fonts.
The primary call-to-action link's `href` MUST be exactly `{{link}}` (unencoded, literally the five characters
`{{link}}`) so the platform can substitute the tracking URL. Return ONLY the raw HTML."

NOTE: the app's own safety markers live OUTSIDE generated output (seed content, awareness pages, the privacy note
in the studio). The no-disclaimers directive applies only to what the model writes INTO the generated HTML; it does
NOT remove the app-injected framing. Keep both facts true.

---

## PART 1 + helper — Shared AI lib and generalized API route

- [ ] 1. Create the provider-neutral AI lib `src/lib/ai.ts` by moving the DeepSeek implementation out of
      `src/lib/deepseek.ts`. Export `generateHtmlWithAi({ prompt, images, kind })` (kind: 'landing' | 'email',
      default 'landing') and `type AiImage { mimeType, data }`. Keep the DashScope OpenAI-compatible request shape
      byte-for-byte (POST `${baseUrl}/chat/completions`, bearer `DASHSCOPE_API_KEY`, messages system+user, image_url
      base64 data URLs), the markdown-fence stripping, exact-error surfacing, and env defaults. Select the system
      instruction by `kind` (landing vs email wording above, both with the no-disclaimers lines). Delete
      `src/lib/deepseek.ts` and `src/lib/gemini.ts`.
      Files: create `src/lib/ai.ts`; delete `src/lib/deepseek.ts`, `src/lib/gemini.ts`.
      Verify: `npm run build` fails only on the route import until item 2 — so do items 1+2 together as one buildable
      unit; after item 2, `npm run build` passes and `npm run lint` passes.

- [ ] 2. Rewrite `src/app/api/generate-content/route.ts` (rename the folder from `generate-landing-page` to
      `generate-content`). Remove the `provider` field and the Gemini branch. Read `kind` (default 'landing'),
      keep the 401 gate, 20MB cap, image/video mime validation; build `AiImage[]` from `image/*` files only (skip
      video), call `generateHtmlWithAi({ prompt, images, kind })`. Keep `{ html }` success / `{ error }`+status
      failure. Drop the GEMINI_API_KEY branch; keep the DASHSCOPE_API_KEY "not configured" message (generic
      wording: "AI generation is not configured. Set DASHSCOPE_API_KEY."). Generic error prefix "Failed to generate
      the content: ...".
      Files: create `src/app/api/generate-content/route.ts`; delete `src/app/api/generate-landing-page/route.ts`.
      Verify: `npm run build` passes; `npm run lint` passes. Manually confirm no remaining import of `gemini`/
      `deepseek`: `npm run build` will error if any dangling import remains.

- [ ] 3. Remove the Gemini dependency. Drop `@google/genai` from `package.json` dependencies and run
      `npm install` to update the lockfile. Grep the repo for `@google/genai`, `GEMINI_API_KEY`, `generateLandingPageHtml`,
      `generateLandingPageHtmlDeepSeek` to confirm no references remain outside README/env docs.
      Files: `package.json`, `package-lock.json`.
      Verify: `npm run build` passes with the dependency removed.

## PART 1 + 3 — Landing-page studio: DeepSeek removal + UI polish

- [ ] 4. Rewrite `src/app/dashboard/landing-pages/create/page.tsx`: remove `provider` state and the model `<select>`;
      stop sending `provider`; POST to `/api/generate-content` with `kind=landing`. Generic button label
      "Generate with AI" (+"Generating…" disabled state), generic sub-panel copy ("Upload photos, describe the page,
      and let AI draft the HTML"). File input `accept="image/*"` with a small note that videos aren't used. Keep all
      functionality: name, urlSlug, `htmlContent` textarea (manual edit), setHtml + switch to preview tab on success,
      inline `aiError` via `.auth-message.error`, removable file chips, `createLandingPage` save, sandbox="" iframe.
      Reformat the minified JSX into readable multi-line JSX.
      Files: `src/app/dashboard/landing-pages/create/page.tsx`.
      Verify: `npm run build` + `npm run lint` pass; manually confirm no "Gemini"/"DeepSeek" strings remain in the file.

- [ ] 5. Polish studio styles in `src/app/globals.css` (the `/* Landing-page studio */` block, lines ~353–355, plus
      the `@media (max-width:1050px)` rule ~line 400 and the `@media (max-width:760px)` stacking rule ~line 419).
      Improve the settings-panel hierarchy/spacing; make `.landing-ai` a visually distinct inviting card; style
      file chips (`.ai-files li`); ensure `.ai-generate:disabled` reads as loading; make `.editor-tabs` active state
      obvious; bump the tiny font sizes to readable values. Keep the semantic class approach (.landing-*, .studio-*,
      .field, .button) — no Tailwind utilities. Keep both responsive breakpoints working (columns stack at 760px).
      Files: `src/app/globals.css`.
      Verify: `npm run build` passes; manually confirm the 760px rule still sets `.landing-studio` to one column.

## PART 2 — Generic wording in docs

- [ ] 6. Update `README.md`: in Features, change the "AI Landing-page Generator" bullet to generic AI wording (no
      "Gemini"); describe the provider as "the AI provider (Alibaba Cloud Model Studio)". In env docs, remove the
      `GEMINI_API_KEY` line, keep `DASHSCOPE_API_KEY`/`DASHSCOPE_BASE_URL`/`DEEPSEEK_MODEL` documented accurately,
      remove the two-provider dropdown note, add that the email-template builder also offers AI generation. Do NOT
      touch `.env`.
      Files: `README.md`.
      Verify: `rg -n "Gemini|GEMINI_API_KEY" README.md` returns nothing.

## PART 4 — AI generation in the email Templates builder

- [ ] 7. Add AI generation to the template CREATE page. Convert
      `src/app/dashboard/templates/create/page.tsx` to add an AI generator sub-panel (prompt textarea + optional
      `image/*` reference upload + "Generate with AI" button with loading/disabled + inline `.auth-message.error`).
      Keep the existing field names `name`, `subject`, `bodyHtml` and make `bodyHtml` a controlled textarea so
      generated HTML drops into its state and stays editable. On generate, POST to `/api/generate-content` with
      `kind=email`; set the returned HTML into the bodyHtml state (do NOT auto-save). Keep the existing
      `{{link}}` helper note and `createTemplate` submit flow unchanged. Reuse existing CSS classes (the page uses
      Tailwind utilities today; the AI sub-panel may reuse `.landing-ai`/`.ai-*`/`.button` classes for consistency).
      Files: `src/app/dashboard/templates/create/page.tsx`.
      Verify: `npm run build` + `npm run lint` pass; manual: generated email contains `{{link}}` (enforced by the
      email system instruction in item 1).

- [ ] 8. (Priority-second, same pattern) Add the same AI generator to the template EDIT page. This requires
      converting `src/app/dashboard/templates/[id]/edit/page.tsx` from a server component (`action={updateTemplate}`)
      to a client component that fetches the template (or receives it from a small server wrapper) and manages
      `bodyHtml` state, so the generated/edited HTML is a controlled textarea. Keep the hidden `id`, `updateTemplate`
      submit, and the `{{link}}` note. If the server→client conversion is risky, keep edit as-is and ship create only
      (create is the stated priority) — document the choice in the FEAT findings.
      Files: `src/app/dashboard/templates/[id]/edit/page.tsx` (+ optionally a thin server wrapper for data fetching).
      Verify: `npm run build` + `npm run lint` pass.

## Cross-cutting final verification
- [ ] 9. Full build + lint gate and dangling-reference sweep.
      Verify: `npm run build` passes, `npm run lint` passes, and
      `rg -n "gemini|deepseek|provider.*select|Generate with (Gemini|DeepSeek)" src` returns no user-facing hits
      (internal implementation comments in `src/lib/ai.ts` referencing DeepSeek/DashScope are acceptable).
