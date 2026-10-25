export default function Loading() {
    return (
        <div className="content-page" aria-busy="true" aria-label="Loading">
            <section className="page-heading">
                <div className="skeleton-stack" style={{ width: 'min(340px, 70%)' }}>
                    <div className="skeleton skeleton-line sm" style={{ width: 90 }} />
                    <div className="skeleton skeleton-line lg" style={{ width: '100%' }} />
                </div>
            </section>
            <div className="data-panel">
                <div className="data-panel-head">
                    <div className="skeleton skeleton-line" style={{ width: 120 }} />
                </div>
                <div className="skeleton" style={{ height: 460, borderRadius: 0 }} />
            </div>
        </div>
    )
}
