# Implementation Plan — PhishSafe AI builder UX overhaul

Next.js 16 App Router + TypeScript + Supabase + Tailwind v4. Package manager: npm. No test framework — do NOT add one. Verification is `npm run build` (+ `npm run lint`) and documented manual runtime checks.

## Scope decisions (made during exploration, grounded in code)

- **Landing-edit resolution:** `src/app/dashboard/landing-pages/` has ONLY `create/page.tsx`, `page.tsx`, `actions.ts`. There is NO `[id]`/edit route and NO `updateLandingPage` in `actions.ts` (verified). Therefore: do NOT build a landing-page edit CRUD. The landing CREATE page is the full editor (it already has the live preview + AI panel). The "iterate with AI" box is added to the landing CREATE page and to BOTH template surfaces (create + edit). A landing edit page is explicitly OUT OF SCOPE; note it as a future enhancement.
- **Create-with-AI handoff (Option 2, no draft DB record):** use **`sessionStorage`**. The list-page popup generates HTML (POST `/api/generate-content`, from scratch), stores `{ html }` under a well-known key (`phishsafe:create-handoff:landing` / `phishsafe:create-handoff:template`), then `router.push` to the create page. The create page, on mount, reads+removes that key (one-shot) and seeds editor state. This avoids large HTML in the URL and persists nothing to the DB until Save. Blank path just navigates with no key set. Rationale: survives the client-side navigation, no server round-trip, no draft record, cleared after read so a refresh shows starter content.
- **Shared vs mirrored editor:** EXTRACT a shared client component `AiHtmlEditor` under `src/components/`. Today the landing studio uses semantic classes (`.landing-editor`, `.editor-tabs`, `.studio-code`, `.studio-preview`, `.landing-ai`) while both template builders use raw Tailwind utility soup — they are inconsistent. A shared component (Code/Preview tabs + sandboxed preview + AI iterate panel) used by all three surfaces is the lowest-duplication way to make them consistent and is required by goal (4). It takes props for `kind`, `html`, `onHtmlChange`, and renders the `<textarea>` the parent `<form>` serializes.

## MUST NOT CHANGE (preserve exactly)

- Safety framing in `src/lib/ai.ts` system instructions: the educational/authorized-simulation wording, "Do not request or store real credentials", "no external resources", email `{{link}}` hard-requirement, table-based email layout rule. Keep the existing no-disclaimer lines as-is (they are already in the file).
- Any "SECURITY AWARENESS TRAINING SIMULATION" / "credentials are NOT stored" markers in UI copy (e.g. landing `.studio-safety` block). Keep them.
- `sandbox=""` on EVERY preview iframe. New previews must also use `sandbox=""`.
- The DashScope request shape in `ai.ts`: endpoint `${baseUrl}/chat/completions`, bearer `DASHSCOPE_API_KEY`, model `DEEPSEEK_MODEL`/default, `messages:[{role:system},{role:user, content:[{type:text},{type:image_url,...}]}]`, markdown-fence stripping, exact-error surfacing. Only ADD `currentHtml` to the text part; do not restructure the request.
- `.env` file, all env var names (`DASHSCOPE_API_KEY`, `DASHSCOPE_BASE_URL`, `DEEPSEEK_MODEL`).
- Save flows: server actions `createLandingPage`, `createTemplate`, `updateTemplate` and their form field names (`name`, `urlSlug`, `htmlContent`; `name`, `subject`, `bodyHtml`, `id`). No auto-save anywhere.
- API route `/api/generate-content` auth gate (401), image/video mime validation, 20MB cap, video-skip, `{ html }` / `{ error }` responses, exact-error surfacing. New `currentHtml` must be backward compatible (absent = today's from-scratch behavior).

---

## Plan

- [ ] 1. Add optional `currentHtml` revision support to `src/lib/ai.ts`.
      Extend `generateHtmlWithAi` params with `currentHtml?: string`. Add two revision system instructions (landing + email) OR append a revision directive to the existing instruction when `currentHtml` is present; keep the from-scratch path untouched when absent. When present, the USER message text must instruct: "Apply the requested changes to the HTML document below and return the COMPLETE revised HTML document. Preserve everything not mentioned. Return ONLY raw HTML." then the current HTML. For `kind==='email'` the revision directive MUST restate: the primary CTA href must remain exactly `{{link}}`. Do NOT touch the DashScope request shape, fence-stripping, or error handling.
      Files: src/lib/ai.ts
      Verify: `npm run build` succeeds (type-check passes). Confirm `currentHtml` is optional (no caller breaks).

- [ ] 2. Thread `currentHtml` through `src/app/api/generate-content/route.ts`.
      Read `const currentHtml = (formData.get('currentHtml') as string | null)?.trim() || undefined`. Pass it to `generateHtmlWithAi`. Keep the "prompt or files required" guard — but when `currentHtml` is present, a prompt alone (no files) is valid (already true since prompt satisfies the guard). Preserve auth/mime/size/video-skip/error handling untouched.
      Files: src/app/api/generate-content/route.ts
      Verify: `npm run build` succeeds. Runtime (needs verification during implementation): POST with `currentHtml` returns revised HTML; POST without it behaves as today.

- [ ] 3. Create the shared `AiHtmlEditor` client component.
      `src/components/ai-html-editor.tsx` ('use client'). Props: `{ kind: 'landing'|'email'; html: string; onHtmlChange: (v:string)=>void; textareaName: string; textareaRequired?: boolean }`. Renders: the Code/Preview `.editor-tabs` + `.studio-code` `<textarea name={textareaName}>` bound to `html` + `.studio-preview` `<iframe srcDoc={html} sandbox="" title="Preview" />` (copy the landing studio markup exactly). Plus an "Iterate with AI" panel using `.landing-ai` markup (reference images chips via `.ai-files`, prompt textarea, submit button `.ai-generate`, inline `.auth-message error`). On submit it builds FormData (`prompt`, `kind`, `files`, and `currentHtml=html` when `html` is non-empty/non-starter), POSTs `/api/generate-content`, and on success calls `onHtmlChange(data.html)` and switches to Preview. Button label: "Revising…" when html present, "Generating…" when empty; idle "Iterate with AI" / "Generate with AI" accordingly. Manage `tab`, `aiPrompt`, `aiFiles`, `aiLoading`, `aiError` internally.
      Files: src/components/ai-html-editor.tsx
      Verify: `npm run build` succeeds. Component compiles and is importable.

- [ ] 4. Refactor the landing CREATE page to use `AiHtmlEditor`.
      Replace the inline `.landing-editor` section AND the inline `.landing-ai` sub-panel in `src/app/dashboard/landing-pages/create/page.tsx` with `<AiHtmlEditor kind="landing" html={html} onHtmlChange={setHtml} textareaName="htmlContent" textareaRequired />`. Keep name/urlSlug fields, `.studio-safety` block, `createLandingPage` submit, `starterHtml`. Add the sessionStorage one-shot read on mount (key `phishsafe:create-handoff:landing`): if present, seed `html` from it, switch to preview, remove the key. Keep `sandbox=""`.
      Files: src/app/dashboard/landing-pages/create/page.tsx
      Verify: `npm run build` succeeds. Runtime: page renders, generate/iterate work, preview sandboxed, save unchanged.

- [ ] 5. Give the template CREATE page the live preview + iterate box via `AiHtmlEditor`.
      In `src/app/dashboard/templates/create/page.tsx` replace the plain `bodyHtml` textarea AND the existing `.landing-ai` generate panel with `<AiHtmlEditor kind="email" html={bodyHtml} onHtmlChange={setBodyHtml} textareaName="bodyHtml" textareaRequired />`. Keep name/subject fields and `createTemplate` submit. Seed a sensible email starter (or empty) and add the sessionStorage one-shot read (key `phishsafe:create-handoff:template`). Wrap the form in the landing studio layout classes (`.landing-studio` / `.landing-settings` / editor) OR keep its current container but ensure the shared editor renders consistently — prefer matching the landing studio two-column layout for goal (4) consistency. Keep `{{link}}` helper text.
      Files: src/app/dashboard/templates/create/page.tsx
      Verify: `npm run build` succeeds. Runtime: Code/Preview tabs work, iframe `sandbox=""`, generate+iterate work, save unchanged.

- [ ] 6. Give the template EDIT form the live preview + iterate box via `AiHtmlEditor`.
      In `src/app/dashboard/templates/[id]/edit/EditTemplateForm.tsx` replace the plain `bodyHtml` textarea + `.landing-ai` panel with `<AiHtmlEditor kind="email" html={bodyHtml} onHtmlChange={setBodyHtml} textareaName="bodyHtml" textareaRequired />`. Keep the hidden `id`, name/subject defaults, `updateTemplate` action, `SubmitButton`. Since existing body_html is present, iterate requests will send `currentHtml` (revision). Keep `{{link}}` helper text.
      Files: src/app/dashboard/templates/[id]/edit/EditTemplateForm.tsx
      Verify: `npm run build` succeeds. Runtime: editing an existing template, iterate revises in place and preview updates.

- [ ] 7. Build the create-mode popup component (Option 2, no draft).
      `src/components/create-resource-dialog.tsx` ('use client'). Props: `{ kind: 'landing'|'template'; createHref: string; label: string }`. Renders a trigger button; opens a modal (backdrop + panel, close button, Escape-to-close, backdrop-click close, focus the panel on open). Two choices: "Create blank" → `router.push(createHref)` (no sessionStorage key). "Create with AI" → EXPANDS the panel in place to reveal image upload (`.ai-files` chips) + prompt textarea + Generate button; on submit POST `/api/generate-content` (from scratch, `kind` mapped: landing→landing, template→email), on success write `{ html }` to `sessionStorage` under `phishsafe:create-handoff:<kind-or-email>` matching the key the create pages read, then `router.push(createHref)`. Show loading + inline `.auth-message error`. Style with existing semantic classes + new modal classes (step 9).
      Files: src/components/create-resource-dialog.tsx
      Verify: `npm run build` succeeds. Runtime: modal opens/closes, both paths navigate correctly, generated HTML lands in the create editor unsaved.

- [ ] 8. Wire the popup into the two list pages without regressing audiences.
      `ResourceLibrary` is shared (audiences/templates/pages) and server-rendered with a plain create `<Link>`. Add an optional `createSlot?: React.ReactNode` prop to `src/components/resource-library.tsx`; when provided, render it in place of the header create `<Link>` (and ideally the empty-state CTA). In `src/app/dashboard/templates/page.tsx` and `src/app/dashboard/landing-pages/page.tsx`, pass `createSlot={<CreateResourceDialog .../>}`. Audience page keeps the plain link (no slot). Keep `createHref`/`createLabel` as the fallback.
      Files: src/components/resource-library.tsx, src/app/dashboard/templates/page.tsx, src/app/dashboard/landing-pages/page.tsx
      Verify: `npm run build` succeeds. Runtime: templates + landing-pages lists show the popup trigger; audiences list unchanged.

- [ ] 9. Add modal + any new editor CSS to globals.css (semantic classes, dark-mode).
      Add `.create-modal-backdrop`, `.create-modal`, `.create-modal-choices`, `.create-modal-expand` (or similar) reusing tokens (`--surface`, `--line`, `--ink`, `--subtle`) so dark mode works via existing `.dark { --surface... }`. Add a `.dark` rule only if a hardcoded color needs it. If the template create page adopts the two-column `.landing-studio` layout, verify no new classes are needed (reuse existing). Do NOT convert anything to Tailwind utilities. Keep responsive behavior at the 1050px/760px breakpoints consistent.
      Files: src/app/globals.css
      Verify: `npm run build` succeeds. Runtime: modal readable in light + dark; editor looks consistent across all three surfaces.

- [ ] 10. Full verification pass.
      Files: (none — verification only)
      Verify: `npm run lint` and `npm run build` both pass clean. Manual runtime checks (needs verification during implementation): (a) landing create — blank + create-with-AI + iterate + preview `sandbox=""` + save; (b) template create — same; (c) template edit — iterate revises existing body, `{{link}}` preserved in email output; (d) popup accessible (Esc/backdrop/close, focus); (e) safety copy + sandbox intact; (f) generating without a key configured still returns the friendly error. Remove any temp files.
