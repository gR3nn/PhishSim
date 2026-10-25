import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export default function DashboardNotFound() {
    return (
        <div className="content-page">
            <section className="center-pad fade-in">
                <div className="state-icon">
                    <ShieldCheck size={26} />
                </div>
                <h1>404</h1>
                <p>This resource doesn&apos;t exist, or you don&apos;t have access to it.</p>
                <div className="state-actions">
                    <Link href="/dashboard" className="button primary">
                        Back to dashboard
                    </Link>
                </div>
            </section>
        </div>
    )
}
