import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="marketing-page">
            <div className="center-pad fade-in">
                <div className="state-icon">
                    <ShieldCheck size={26} />
                </div>
                <h1>404</h1>
                <p>We couldn&apos;t find the page you were looking for. It may have moved or never existed.</p>
                <div className="state-actions">
                    <Link href="/" className="button primary">
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    )
}
