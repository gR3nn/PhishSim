import { GoogleGenAI, type Part } from '@google/genai'

// Flash tier: fast, cost-effective, and supports multimodal (image + video) input.
const MODEL_ID = 'gemini-2.0-flash'

export interface GeminiMedia {
    /** IANA MIME type of the media, e.g. "image/png" or "video/mp4". */
    mimeType: string
    /** Base64-encoded bytes with no "data:" prefix. */
    data: string
}

const SYSTEM_INSTRUCTION = `You are an expert web designer building a safe, educational phishing-simulation landing page for an authorized security-awareness training platform.

Requirements:
- Return a SINGLE, self-contained HTML document.
- Use only inline CSS (in a <style> tag or style attributes). Do not reference any external resources (no external stylesheets, fonts, images, or CDNs).
- Do not include any <script> that fetches remote data or exfiltrates information.
- Do not request or store real credentials. This page is for educational purposes only.
- Return ONLY the raw HTML. Do not wrap it in markdown code fences or add any commentary.`

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

/**
 * Send the prompt and any media to Gemini and return the generated HTML string.
 * Throws a clear error if the API key is not configured.
 */
export async function generateLandingPageHtml({
    prompt,
    media,
}: {
    prompt: string
    media: GeminiMedia[]
}): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set')
    }

    const ai = new GoogleGenAI({ apiKey })

    const parts: Part[] = [
        { text: `${SYSTEM_INSTRUCTION}\n\nUser request:\n${prompt}` },
        ...media.map((item): Part => ({
            inlineData: { mimeType: item.mimeType, data: item.data },
        })),
    ]

    const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: parts,
    })

    const text = response.text
    if (!text) {
        throw new Error('The AI did not return any content.')
    }

    return stripMarkdownFences(text)
}
