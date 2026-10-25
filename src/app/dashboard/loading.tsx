export default function DashboardLoading() {
    return (
        <div className="content-page" aria-busy="true" aria-label="Loading">
            <section className="page-heading">
                <div className="skeleton-stack" style={{ width: 'min(340px, 70%)' }}>
                    <div className="skeleton skeleton-line sm" style={{ width: 90 }} />
                    <div className="skeleton skeleton-line lg" style={{ width: '100%' }} />
                </div>
            </section>

            <section className="stat-grid">
                <div className="skeleton skeleton-card" />
                <div className="skeleton skeleton-card" />
                <div className="skeleton skeleton-card" />
                <div className="skeleton skeleton-card" />
            </section>

            <div className="data-panel">
                <div className="data-panel-head">
                    <div className="skeleton skeleton-line" style={{ width: 160 }} />
                </div>
                <div className="skeleton-stack" style={{ padding: 18 }}>
                    <div className="skeleton skeleton-row" />
                    <div className="skeleton skeleton-row" />
                    <div className="skeleton skeleton-row" />
                    <div className="skeleton skeleton-row" />
                </div>
            </div>
        </div>
    )
}
