'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
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
        <div className="content-page">
            <section className="center-pad fade-in">
                <div className="state-icon alert">
                    <AlertTriangle size={26} />
                </div>
                <h3>Something went wrong</h3>
                <p>We hit a snag loading this part of your workspace. You can try again, or head back to the dashboard.</p>
                <div className="state-actions">
                    <button type="button" className="button primary" onClick={reset}>
                        Try again
                    </button>
                    <Link href="/dashboard" className="button secondary">
                        Back to dashboard
                    </Link>
                </div>
            </section>
        </div>
    )
}
