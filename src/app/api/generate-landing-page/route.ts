import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateLandingPageHtml, type GeminiMedia } from '@/lib/gemini'

const MAX_TOTAL_BYTES = 20 * 1024 * 1024 // ~20MB total payload guard

export async function POST(request: Request) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const formData = await request.formData()
        const prompt = (formData.get('prompt') as string | null)?.trim() ?? ''
        const files = formData
            .getAll('files')
            .filter((entry): entry is File => entry instanceof File)

        if (!prompt && files.length === 0) {
            return NextResponse.json(
                { error: 'Add a comment or at least one file to generate a page.' },
                { status: 400 }
            )
        }

        let totalBytes = 0
        for (const file of files) {
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                return NextResponse.json(
                    { error: 'Only image and video files are allowed.' },
                    { status: 400 }
                )
            }
            totalBytes += file.size
        }

        if (totalBytes > MAX_TOTAL_BYTES) {
            return NextResponse.json(
                { error: 'Uploaded files exceed the 20MB limit.' },
                { status: 400 }
            )
        }

        const media: GeminiMedia[] = await Promise.all(
            files.map(async (file) => ({
                mimeType: file.type,
                data: Buffer.from(await file.arrayBuffer()).toString('base64'),
            }))
        )

        const html = await generateLandingPageHtml({ prompt, media })

        return NextResponse.json({ html })
    } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (message.includes('GEMINI_API_KEY')) {
            return NextResponse.json(
                {
                    error: 'AI generation is not configured. Set GEMINI_API_KEY in your environment.',
                },
                { status: 500 }
            )
        }

        console.error('Error generating landing page:', error)
        return NextResponse.json(
            { error: 'Failed to generate the landing page.' },
            { status: 500 }
        )
    }
}
