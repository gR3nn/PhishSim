'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function RootError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="marketing-page">
            <div className="center-pad fade-in">
                <div className="state-icon alert">
                    <AlertTriangle size={26} />
                </div>
                <h3>Something went wrong</h3>
                <p>An unexpected error occurred. You can try again, or return to the home page.</p>
                <div className="state-actions">
                    <button type="button" className="button primary" onClick={reset}>
                        Try again
                    </button>
                    <Link href="/" className="button secondary">
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    )
}
