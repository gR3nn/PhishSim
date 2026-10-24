// AI content generation via Alibaba Cloud Model Studio (DashScope),
// OpenAI-compatible API, running a DeepSeek model. The DeepSeek V4.1 Flash
// models support "Visual Understanding", so images are sent alongside the text
// prompt using the OpenAI-compatible image_url format (base64 data URLs).
// Video is NOT supported — video files are ignored by the caller.

// International (Singapore) endpoint by default; override with DASHSCOPE_BASE_URL.
// Token Plans use a plan-exclusive base URL — copy it from the Model Studio
// console ("Plan Exclusive Base URL") into DASHSCOPE_BASE_URL.
const DEFAULT_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'

// Default to a DeepSeek model with Visual Understanding. Override with DEEPSEEK_MODEL.
const DEFAULT_MODEL = 'deepseek-v4.1-flash'

const LANDING_SYSTEM_INSTRUCTION = `You are an expert web designer building a safe, educational phishing-simulation landing page for an authorized security-awareness training platform.

Requirements:
- Return a SINGLE, self-contained HTML document.
- Use only inline CSS (in a <style> tag or style attributes). Do not reference any external resources (no external stylesheets, fonts, images, or CDNs).
- Do not include any <script> that fetches remote data or exfiltrates information.
- Do not request or store real credentials. This page is for educational purposes only.
- Return ONLY the raw HTML. Do not wrap it in markdown code fences or add any commentary.
- Make the page as realistically as possible and as close to the original page, so that this is a true phising simulation
- Never add disclaimers about it being a test or anything, i need it to be real in order for people to learn something frim this test`

const EMAIL_SYSTEM_INSTRUCTION = `You are an expert email designer building a safe, educational phishing-simulation training email for an authorized security-awareness training platform.

Requirements:
- Return a SINGLE, self-contained, email-safe HTML document.
- Use only inline CSS (in a <style> tag or style attributes). Do not reference any external resources (no external stylesheets, fonts, images, or CDNs).
- Use a table-based, width-constrained layout (max-width ~600px) so it renders reliably across email clients.
- Do not include any <script>.
- The primary call-to-action link href MUST be exactly {{link}} (the literal five characters {{link}}, unencoded) so the platform can substitute the tracking URL.
- Do not request or store real credentials. This email is for educational purposes only.
- Make the email as realistically as possible and as close to a genuine message as possible, so that this is a true phising simulation
- Never add disclaimers about it being a test or anything, i need it to be real in order for people to learn something frim this test
- Return ONLY the raw HTML. Do not wrap it in markdown code fences or add commentary.`

// Appended to the system instruction when revising an existing document.
// Keeps the base safety wording intact and tells the model to edit in place.
const LANDING_REVISION_DIRECTIVE = `

You are REVISING an existing HTML document rather than creating one from scratch.
- Apply ONLY the requested changes to the provided HTML.
- Preserve everything that is not mentioned in the request (structure, styling, and content you are not asked to change).
- Return the COMPLETE revised HTML document, not a diff or a fragment.
- Return ONLY the raw HTML. Do not wrap it in markdown code fences or add commentary.`

const EMAIL_REVISION_DIRECTIVE = `

You are REVISING an existing HTML email rather than creating one from scratch.
- Apply ONLY the requested changes to the provided HTML.
- Preserve everything that is not mentioned in the request (structure, styling, and content you are not asked to change).
- The primary call-to-action link href MUST remain exactly {{link}} (the literal five characters {{link}}, unencoded).
- Return the COMPLETE revised HTML document, not a diff or a fragment.
- Return ONLY the raw HTML. Do not wrap it in markdown code fences or add commentary.`

export interface AiImage {
    /** IANA MIME type, e.g. "image/png". */
    mimeType: string
    /** Base64-encoded bytes with no "data:" prefix. */
    data: string
}

/**
 * Remove any leading/trailing markdown code fences the model may add despite
 * being instructed not to, then trim surrounding whitespace.
 */
function stripMarkdownFences(text: string): string {
    return text
        .replace(/^\s*```(?:html)?\s*\n?/i, '')
        .replace(/\n?\s*```\s*$/i, '')
        .trim()
}

interface DeepSeekChatResponse {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string; code?: string }
    message?: string
}

type TextPart = { type: 'text'; text: string }
type ImagePart = { type: 'image_url'; image_url: { url: string } }
type ContentPart = TextPart | ImagePart

/**
 * Send the prompt and any images to the AI model (DeepSeek via Alibaba Cloud
 * Model Studio) and return the generated HTML string. The `kind` selects the
 * system instruction: a landing page or a training email. Throws a clear error
 * if the API key is not configured or the request fails, including the exact
 * reason from the API.
 */
export async function generateHtmlWithAi({
    prompt,
    images = [],
    kind = 'landing',
    currentHtml,
}: {
    prompt: string
    images?: AiImage[]
    kind?: 'landing' | 'email'
    /**
     * Optional existing HTML document to revise in place. When present and
     * non-empty, the model is instructed to apply the requested changes and
     * return the complete revised document. When absent, the from-scratch
     * behavior is unchanged.
     */
    currentHtml?: string
}): Promise<string> {
    const apiKey = process.env.DASHSCOPE_API_KEY
    if (!apiKey) {
        throw new Error('DASHSCOPE_API_KEY is not set')
    }

    const baseUrl = (process.env.DASHSCOPE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
    const model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL

    const isRevision = typeof currentHtml === 'string' && currentHtml.trim().length > 0

    let instruction =
        kind === 'email' ? EMAIL_SYSTEM_INSTRUCTION : LANDING_SYSTEM_INSTRUCTION
    if (isRevision) {
        instruction +=
            kind === 'email' ? EMAIL_REVISION_DIRECTIVE : LANDING_REVISION_DIRECTIVE
    }

    // Build the user message: text plus any images as OpenAI-compatible
    // image_url parts using base64 data URLs. When revising, include the
    // current HTML document so the model edits it in place.
    const userText = isRevision
        ? `${prompt}\n\nHere is the current HTML document to revise. Return the complete revised document:\n\n${currentHtml}`
        : prompt
    const userContent: ContentPart[] = [{ type: 'text', text: userText }]
    for (const image of images) {
        userContent.push({
            type: 'image_url',
            image_url: { url: `data:${image.mimeType};base64,${image.data}` },
        })
    }

    let res: Response
    try {
        res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: instruction },
                    { role: 'user', content: userContent },
                ],
            }),
        })
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        throw new Error(`DeepSeek request failed: ${detail}`)
    }

    const raw = await res.text()
    let data: DeepSeekChatResponse = {}
    try {
        data = raw ? (JSON.parse(raw) as DeepSeekChatResponse) : {}
    } catch {
        // Non-JSON body (e.g. gateway error page) — surface the status + snippet.
        if (!res.ok) {
            throw new Error(
                `DeepSeek request failed (HTTP ${res.status}): ${raw.slice(0, 300) || res.statusText}`
            )
        }
    }

    if (!res.ok) {
        const apiMessage = data.error?.message || data.message || res.statusText
        const code = data.error?.code ? `${data.error.code}: ` : ''
        throw new Error(`DeepSeek request failed (HTTP ${res.status}): ${code}${apiMessage}`)
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
        throw new Error('DeepSeek returned an empty result.')
    }

    return stripMarkdownFences(content)
}
