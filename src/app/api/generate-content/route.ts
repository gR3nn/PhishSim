import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateHtmlWithAi, type AiImage } from '@/lib/ai'

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
        const kind = formData.get('kind') === 'email' ? 'email' : 'landing'
        const currentHtml = (formData.get('currentHtml') as string | null)?.trim() || undefined
        const files = formData
            .getAll('files')
            .filter((entry): entry is File => entry instanceof File)

        if (!prompt && files.length === 0) {
            return NextResponse.json(
                { error: 'Add a comment or at least one file to generate content.' },
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

        // The model supports images (Visual Understanding) but not video — send
        // only image files, skipping any uploaded videos.
        const images: AiImage[] = await Promise.all(
            files
                .filter((file) => file.type.startsWith('image/'))
                .map(async (file) => ({
                    mimeType: file.type,
                    data: Buffer.from(await file.arrayBuffer()).toString('base64'),
                }))
        )

        const html = await generateHtmlWithAi({ prompt, images, kind, currentHtml })

        return NextResponse.json({ html })
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        if (message.includes('DASHSCOPE_API_KEY')) {
            return NextResponse.json(
                {
                    error: 'AI-assisted creation is temporarily unavailable. You can continue with the standard editor.',
                },
                { status: 500 }
            )
        }

        console.error('Error generating content:', error)
        return NextResponse.json(
            {
                // Surface the exact reason the request failed so it can be diagnosed.
                error: `Failed to generate the content: ${message || 'Unknown error'}`,
            },
            { status: 500 }
        )
    }
}
