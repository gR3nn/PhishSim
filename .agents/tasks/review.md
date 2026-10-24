# AI-provider refactor: single DeepSeek provider, generic wording, polished landing studio, template-builder AI

The change collapses the two-provider (Gemini + DeepSeek) AI path down to a single provider-neutral library and route. `src/lib/gemini.ts` and `src/lib/deepseek.ts` are gone, replaced by `src/lib/ai.ts` exporting `generateHtmlWithAi({ prompt, images, kind })` and `AiImage`. The API route folder is renamed to `/api/generate-content` and selects a system instruction by a `kind` param (`landing` | `email`). The landing studio drops its provider dropdown and now shows generic "Generate with AI" wording with readable, reformatted JSX. The email template builder (both create and edit pages) gains an AI sub-panel that fills the `bodyHtml` textarea without auto-saving, and the email system instruction hard-requires the literal `{{link}}` placeholder so campaign link substitution keeps working. `@google/genai` is removed from `package.json` and the lockfile.

Watch for: a non-blocking posture note only — runtime error strings surfaced to the UI still read "DeepSeek request failed (HTTP …)" (confirmed). These are diagnostic messages, not UI labels, and the user explicitly asked for exact failure reasons, so they are acceptable; no primary UI label, button, env-var-facing string, or README text names a provider.

**Verdict**: APPROVED

## High-level view

Provider unification is clean. The only remaining `DeepSeek`/`deepseek` tokens in source are inside `src/lib/ai.ts`: internal comments, the `DeepSeekChatResponse` type name, the required `DEEPSEEK_MODEL` env var, and error-message strings. The exported surface (`generateHtmlWithAi`, `AiImage`) is provider-neutral, which is exactly what the spec required. Gemini is fully excised — no `@google/genai`, no `GEMINI_API_KEY`, no gemini module.

The API contract is preserved byte-for-byte: 401 auth gate, prompt-or-file requirement, image/video mime validation, 20MB total cap, video files accepted for validation but skipped when building the model payload, and exact HTTP-status + API-message error surfacing. The DashScope OpenAI-compatible request shape (base URL, model default `deepseek-v4.1-flash`, `messages` with system + multimodal user content, `Bearer` auth) is intact.

The landing studio is functional and polished: provider state and the model `<select>` are gone, it POSTs to `/api/generate-content` with `kind=landing`, the `sandbox=""` preview iframe and the `createLandingPage` save via the form action are untouched, and the previously minified single-line JSX is now readable multi-line JSX. CSS gained an inviting `.landing-ai` card, readable file chips, an obvious disabled state, active-tab styling, font sizes bumped to ≥11px, and coherent `.dark` overrides; both responsive breakpoints (1050px narrows the settings column, 760px stacks to one column) still work.

The template builder AI works on both create and edit pages. `bodyHtml` is controlled state, generation only calls `setBodyHtml(data.html)` with no auto-submit, the `name`/`subject`/`bodyHtml` field names and the `createTemplate`/`updateTemplate` save flows are unchanged, and generated emails are instructed to embed the literal `{{link}}`. Safety framing, env var names, the seed script, and `.env` are all preserved. `npm run build` and `npm run lint` both pass.

<details>
<summary>Issues (0)</summary>

No blocking or actionable findings. One informational note (not an action item): error strings in `src/lib/ai.ts` name "DeepSeek"; this is permitted by the spec (non-exported, diagnostic) and aligns with the user's request for exact error reasons.

</details>

<details>
<summary>Details</summary>

### Provider unification and the provider-neutral surface

`src/lib/ai.ts` is the single AI entry point. Its exports are `generateHtmlWithAi` and the `AiImage` interface — both provider-neutral. The spec explicitly allowed internal comments and non-exported identifiers to keep mentioning DeepSeek/DashScope, and that is where the remaining tokens live: the file header comments, the `DeepSeekChatResponse` response type, the `DEEPSEEK_MODEL` env var (a name the context pins as immutable), and the thrown error strings. A grep across `src/**` for `Gemini|DeepSeek|@google/genai|GEMINI_API_KEY|generate-landing-page` returns matches only inside this one file, confirmed. `src/lib/gemini.ts` and `src/lib/deepseek.ts` no longer exist, `@google/genai` is absent from `package.json`, and the lockfile has zero `@google/genai` occurrences (confirmed).

The request shape is preserved: default base URL `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` with a trailing-slash strip, default model `deepseek-v4.1-flash`, OpenAI-compatible `POST ${baseUrl}/chat/completions` with `Authorization: Bearer ${DASHSCOPE_API_KEY}`, a system message chosen by `kind`, and a multimodal user message carrying the text plus base64 `image_url` data URLs. The empty-key throw, network-error wrap, non-JSON-body handling, HTTP-status + API-message surfacing, empty-result throw, and `stripMarkdownFences` are all retained (confirmed).

### API route contract (`/api/generate-content`)

The route keeps the standard auth gate (`getUser()` → 401 when absent) and reads `prompt` (trimmed), `kind` (`email` only when the field equals `email`, else `landing`), and `files` via `getAll` filtered to `File` instances. It enforces prompt-or-at-least-one-file (400), per-file `image/`+`video/` mime validation (400), and a 20MB total cap (400). When building the model payload it filters to `image/*` only, so uploaded videos are validated but never sent — matching the "images supported, video ignored" intent. The catch block maps a missing-key error to a friendly "AI generation is not configured. Set DASHSCOPE_API_KEY…" 500 and otherwise returns `Failed to generate the content: <message>` after `console.error`. No `provider` field and no Gemini branch remain (confirmed).

### Landing studio

Provider `useState` and the `#aiProvider` `<select>` are removed; `handleGenerate` appends `kind='landing'` (no `provider`) and fetches `/api/generate-content`, then `setHtml(data.html)` + `setTab('preview')` on success. The reference-media input is `accept="image/*"` with a note that videos aren't used. The controlled `htmlContent` textarea, removable `.ai-files` chips, inline `auth-message error`, Cancel/Save, the code/preview tabs, the `studio-safety` privacy note, and the `createLandingPage` submit via the `../actions` form action are all present. The preview `iframe` keeps `sandbox=""` unchanged (confirmed). The JSX is reformatted into readable multi-line elements.

### Template builder AI (create + edit)

Both `templates/create/page.tsx` and the new `templates/[id]/edit/EditTemplateForm.tsx` (a client child of a thin server wrapper that still fetches the row) carry the same AI sub-panel: `aiPrompt`/`aiFiles` state, image-only uploads with removable chips, a `Generate with AI` button with an `aiLoading` disabled state, and inline error. `handleGenerate` posts `kind='email'` and calls only `setBodyHtml(data.html)` — no call to `createTemplate`/`updateTemplate`, so nothing auto-saves. The `bodyHtml` textarea is controlled (`value={bodyHtml}`) and keeps its `name="bodyHtml"` + `required`, so the unchanged save actions still receive it. Each helper note tells the user the `{{link}}` tracking link is added automatically, and the email system instruction server-side requires the literal five-character `{{link}}` in the CTA href, keeping the `/{{link}}/g` substitution in `campaigns/actions.ts` working.

### Safety posture and preservation

`SECURITY AWARENESS TRAINING SIMULATION` framing, the "credentials are NOT stored" guarantee, and the `sandbox=""` preview iframe are intact. The system instructions keep the no-external-resources / no-exfil-script / no-real-credentials rules while honoring the user's "no disclaimers, most realistic page" request. `landing-pages/actions.ts`, `templates/actions.ts`, `campaigns/actions.ts`, `scripts/seed-default-content.mjs`, and `.env` show no diff against `origin/main` (confirmed). README wording is generic ("the AI provider (Alibaba Cloud Model Studio)"), documents `DASHSCOPE_API_KEY` / `DASHSCOPE_BASE_URL` / `DEEPSEEK_MODEL` with unchanged names, and no longer mentions Gemini or `GEMINI_API_KEY`.

### Verification

`npm run build` exits 0; the route tree lists `/api/generate-content` and no `generate-landing-page`. `npm run lint` exits 0 with no warnings. The dangling-reference sweep is clean outside the allowed internal mentions in `src/lib/ai.ts`.

</details>

<details>
<summary>File map</summary>

- `src/lib/ai.ts` — new provider-neutral AI client; `generateHtmlWithAi` + `AiImage`, landing/email system instructions, DashScope request shape preserved.
- `src/app/api/generate-content/route.ts` — renamed route; `kind` param, no provider field, auth gate / mime + size validation / exact error surfacing.
- `src/app/dashboard/landing-pages/create/page.tsx` — provider UI removed, generic "Generate with AI", readable JSX, `sandbox=""` + save flow intact.
- `src/app/dashboard/templates/create/page.tsx` — AI sub-panel, controlled `bodyHtml`, no auto-save.
- `src/app/dashboard/templates/[id]/edit/EditTemplateForm.tsx` — new client form with AI sub-panel; submits via `updateTemplate`.
- `src/app/dashboard/templates/[id]/edit/page.tsx` — thin server wrapper passing the row to `EditTemplateForm`.
- `src/app/globals.css` — polished `.landing-ai` card, readable chips, active-tab/disabled states, bumped fonts, dark overrides; both media queries retained.
- `README.md` — generic AI-provider wording, Gemini/`GEMINI_API_KEY` removed, DASHSCOPE_*/DEEPSEEK_MODEL documented.
- `package.json` / `package-lock.json` — `@google/genai` removed.

Deleted: `src/lib/gemini.ts`, `src/lib/deepseek.ts`, `src/app/api/generate-landing-page/`.

Full diff: `git diff origin/main` (HEAD = `34854a2`).

</details>
