# Implementation Plan — AI-assisted landing-page generation

Feature: In the existing "Create landing page" studio, let a user upload photos and/or videos plus a text comment, send them to Google Gemini, and receive a complete HTML document that populates the existing editor/preview. The AI never auto-saves; the user saves manually through the existing `createLandingPage` flow.

## Design decisions (grounded in the codebase)

- SDK: `@google/genai` (current official Google Gen AI JS SDK). Call surface verified against the official docs/samples: `new GoogleGenAI({ apiKey })` then `await ai.models.generateContent({ model, contents })`, where `contents` is an array of parts, media parts use `{ inlineData: { mimeType, data } }` with base64 `data`, and the text answer is read from `response.text`. The coder must re-confirm this exact surface against `node_modules/@google/genai` types/README after install (item 1); if `@google/genai` fails to resolve, fall back to `@google/generative-ai` (`new GoogleGenerativeAI(key).getGenerativeModel({ model }).generateContent([...])`, media via `{ inlineData: { mimeType, data } }`, text via `result.response.text()`) and adapt item 2 accordingly. Rationale: official SDK, multimodal (image+video) support, matches the task's named target.
- Model id: `gemini-2.0-flash`. Rationale: flash tier for cost/speed, supports vision and video inline input. Keep the id in one named constant in `gemini.ts` so it is trivial to change.
- Route runtime: Node.js (default for App Router route handlers). Rationale: base64 conversion uses `Buffer`, and the Supabase SSR cookie client expects the Node runtime. Do not set `export const runtime = 'edge'`.
- Request transport: `multipart/form-data` read with `request.formData()`. Rationale: files + text in one POST, matches the browser `FormData` the client already builds elsewhere, avoids a large JSON base64 body on the wire.
- Size/type limits enforced server-side: total payload ~20MB, allowed mime types `image/*` and `video/*` only. Rationale: task requirement; protects the Gemini call and the server.
- Auth: server Supabase client `createClient()` + `auth.getUser()`, returning 401 JSON (not `redirect`) because this is a fetch API, not a navigation. Rationale: the client needs a JSON error to render inline, and `redirect()` in a route handler would not help an XHR caller.

## Items

- [ ] 1. Install the Gemini SDK and confirm its API surface.
      Run `npm install @google/genai` (pins whatever version npm resolves into `package.json`/`package-lock.json`). If that package name fails to resolve, run `npm install @google/generative-ai` instead and note which one was installed. Then read the installed package's types/README under `node_modules/` to confirm the exact exported class, the `generateContent` argument shape, how `inlineData`/base64 media parts are passed, and how to read the text result — adapt items 2–3 to the confirmed surface before writing them.
      Files: `package.json`, `package-lock.json` (both updated by npm).
      Verify: `npm ls @google/genai` (or `@google/generative-ai`) prints the installed version with no error; `npm run build` still completes (no new code yet, confirms install did not break the tree).

- [ ] 2. Create the Gemini helper lib.
      Create `generateLandingPageHtml({ prompt, media })` where `media` is `Array<{ mimeType: string; data: string }>` (base64, no data: prefix). It reads `process.env.GEMINI_API_KEY` and throws `new Error('GEMINI_API_KEY is not set')` if absent (do not hardcode a key). It builds `contents` with a leading text part that includes the system instruction (act as an expert web designer; return a SINGLE self-contained HTML document with inline CSS, no external resources, no `<script>` that fetches remote data; safe educational phishing-simulation landing page; return ONLY raw HTML, no markdown fences) followed by the user's `prompt`, then one `{ inlineData: { mimeType, data } }` part per media item. Call the model (constant `MODEL_ID = 'gemini-2.0-flash'`), read the text output, and defensively strip leading/trailing markdown fences (regex removing an opening ```` ```html ```` or ```` ``` ```` and a trailing ```` ``` ````, then `.trim()`), returning the raw HTML string. Export a typed `GeminiMedia` interface for reuse by the route.
      Files: `src/lib/gemini.ts`
      Verify: `npm run build` compiles with no TypeScript errors; `npm run lint` reports no errors for the new file.

- [ ] 3. Create the generate API route (POST).
      Create a POST handler that: (a) `const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`. (b) `const formData = await request.formData()`; read `prompt` (string) and `formData.getAll('files')` as `File[]`. (c) Validate: require at least a prompt or one file; for each file enforce `mimeType.startsWith('image/') || startsWith('video/')` else return `{ error: 'Only image and video files are allowed.' }` 400; sum `file.size` and if total > ~20MB (20 * 1024 * 1024) return `{ error: 'Uploaded files exceed the 20MB limit.' }` 400. (d) Convert each file to base64 via `Buffer.from(await file.arrayBuffer()).toString('base64')`, capturing `file.type` as mimeType, building the `GeminiMedia[]`. (e) Call `generateLandingPageHtml({ prompt, media })` and return `NextResponse.json({ html })`. (f) Wrap in try/catch: if the caught error message mentions the missing key (`GEMINI_API_KEY`), return `{ error: 'AI generation is not configured. Set GEMINI_API_KEY in your environment.' }` with status 500; otherwise log server-side and return `{ error: 'Failed to generate the landing page.' }` 500. Treat file bytes and the model response as untrusted (no eval, no execution).
      Files: `src/app/api/generate-landing-page/route.ts`
      Verify: `npm run build` compiles (route is detected and type-checks); `npm run lint` clean. Runtime smoke test deferred to item 6.

- [ ] 4. Add the AI-generator UI panel to the create page.
      In the `landing-settings` section (before the `studio-safety` block), add an "AI generator" panel as a client-side UI (keep the file a `'use client'` component; do NOT nest another `<form>` inside the existing form — use plain inputs with React state and a `type="button"` button so the AI action never submits the save form). Add React state: `files: File[]`, `aiPrompt: string`, `aiLoading: boolean`, `aiError: string`. Render: a `<input type="file" accept="image/*,video/*" multiple>` (uncontrolled; `onChange` appends `Array.from(e.target.files)` to `files`), a list of selected file names each with a remove button (`type="button"`) that filters that index out of `files`, a `<textarea>` bound to `aiPrompt` for the comment/prompt, and a "Generate with AI" button (`type="button"`, `disabled={aiLoading}`, label `aiLoading ? 'Generating…' : 'Generate with AI'`). On click, call an async `handleGenerate` that builds a `FormData`, appends `prompt` and each file under key `files`, `fetch('/api/generate-landing-page', { method: 'POST', body: form })`, parses JSON; on `res.ok` call `setHtml(data.html)` and `setTab('preview')`; on failure set `aiError` to `data.error` (or a generic message). Render `aiError` with the existing `<div className="auth-message error">` pattern inside the panel. Do not remove or alter the existing name/slug fields, the editor, the `htmlContent` textarea binding, or the Save button/flow.
      Files: `src/app/dashboard/landing-pages/create/page.tsx`
      Verify: `npm run build` compiles; `npm run lint` clean. Visual/flow check deferred to item 6.

- [ ] 5. Add AI-panel styles to the global stylesheet.
      In the "Landing-page studio" section of `globals.css`, append hand-written semantic classes (match the existing compact, single-line `.landing-*`/`.studio-*` style — not Tailwind utilities) for the new panel: e.g. `.landing-ai` (container with top margin/border matching `.studio-safety` spacing), `.landing-ai` heading, a `.ai-files` list with per-item name + remove button, and an AI generate button treatment consistent with `.button`/`.studio-actions`. Reuse existing tokens (`var(--line)`, `var(--signal)`, `var(--subtle)`) and the existing `.field` styling for the textarea where possible so markup stays minimal.
      Files: `src/app/globals.css`
      Verify: `npm run build` compiles; load `/dashboard/landing-pages/create` in `npm run dev` and confirm the panel renders consistently with the existing settings column (part of item 6).

- [ ] 6. Manual end-to-end verification (no test framework per constraints).
      Run `npm run build` for the full type/compile check, then `npm run dev`. With `GEMINI_API_KEY` unset, POST to `/api/generate-landing-page` (or click Generate) and confirm a friendly 500 JSON `{ error: ... }` about the missing key and that it renders inline via `auth-message error`. Then with a valid key in `.env.local` (the user adds this), upload an image and/or video + a comment, click Generate, and confirm: button shows "Generating…" and is disabled, generated HTML lands in the editor textarea and preview (tab switches to preview), the iframe keeps `sandbox=""`, and the existing Save flow still inserts via `createLandingPage` unchanged. Also confirm a non-image/non-video upload and an over-20MB payload each return the expected 400 JSON.
      Files: none (verification only).
      Verify: `npm run build` exits 0; the manual steps above behave as described. Note in the task output any step blocked by the absent key (the user supplies it after implementation).

- [ ] 7. Update the README.
      Add one bullet to the Features list about AI-assisted landing-page generation (upload photos/videos + a comment, Gemini returns HTML into the editor for review before saving). Add `GEMINI_API_KEY=` to the env example block (the ```env fenced block under "Configure Environment Variables"), and note that `GEMINI_API_KEY` must be set in `.env.local`/`.env` for the feature to work. Do NOT edit the real `.env` file.
      Files: `README.md`
      Verify: re-read the README and confirm the Features bullet and the `GEMINI_API_KEY=` env line are present and correctly placed; `npm run build` unaffected.

## Notes / assumptions

- The task says fail gracefully on a missing key; items 2/3 implement throw-in-lib, catch-in-route so the single missing-key check lives in the lib and the route maps it to a friendly 500.
- `getAll('files')` returns `FormDataEntryValue[]`; filter to `File` instances before reading bytes to satisfy TypeScript and ignore stray string entries.
- The 20MB limit is a total-payload guard; Gemini inline-data requests also have their own per-request ceiling, so this conservative limit doubles as protection against oversized model calls.
- No test framework is added (explicit constraint); verification is `npm run build` + `npm run lint` + the manual flow in item 6.

## Verification evidence (recorded for the reviewer)

Commands run (once, single-run mode):
- `npm install @google/genai` → added **@google/genai@2.30.0** (pinned as `^2.30.0` in package.json; exact resolution in package-lock.json). The official `@google/genai` name resolved; no fallback to `@google/generative-ai` was needed.
- `npm ls @google/genai` → `@google/genai@2.30.0`, no errors.
- `npm run build` (Next.js 16 production build) → **exit 0**, compiled with no type errors. Route `ƒ /api/generate-landing-page` is listed as a server-rendered (dynamic) route; `/dashboard/landing-pages/create` builds unchanged.
- `npm run lint` (eslint) → **exit 0**, no errors/warnings in touched files.

SDK surface used (confirmed against `node_modules/@google/genai/dist/genai.d.ts`):
- Client: `new GoogleGenAI({ apiKey })` (constructor takes `GoogleGenAIOptions` with `apiKey`).
- Call: `await ai.models.generateContent({ model, contents })` where `contents` is a `Part[]`.
- Media parts: `{ inlineData: { mimeType, data } }` (`Blob_2` has `mimeType` + base64 `data`).
- Text output: `response.text` (getter, `string | undefined`).
- Model id: **`gemini-2.0-flash`** (vision + video capable, flash tier), kept in the `MODEL_ID` constant in `src/lib/gemini.ts`.

Missing-key path (reasoned, since no key is set yet — expected):
- `src/lib/gemini.ts` reads `process.env.GEMINI_API_KEY` and throws `new Error('GEMINI_API_KEY is not set')` before any network call.
- `src/app/api/generate-landing-page/route.ts` catches it, matches `message.includes('GEMINI_API_KEY')`, and returns `NextResponse.json({ error: 'AI generation is not configured. Set GEMINI_API_KEY in your environment.' }, { status: 500 })` — a clean JSON response, not a crash.
- The create page's `handleGenerate` reads `res.ok`, sets `aiError` from `data.error`, and renders it via `<div className="auth-message error">`. On success it calls `setHtml(data.html)` then `setTab('preview')`; the iframe keeps `sandbox=""` and the `createLandingPage` save flow is untouched.

Files created:
- `src/lib/gemini.ts`
- `src/app/api/generate-landing-page/route.ts`

Files modified:
- `src/app/dashboard/landing-pages/create/page.tsx` (AI panel + state + handler; save flow unchanged)
- `src/app/globals.css` (`.landing-ai`, `.landing-ai-title`, `.ai-files`, `.ai-generate` styles)
- `README.md` (feature bullet + `GEMINI_API_KEY=` env line + note)
- `package.json` / `package-lock.json` (dependency added by npm)

Live Gemini calls were not exercised (no key yet, per task).
