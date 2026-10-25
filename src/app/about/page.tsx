import { HeartHandshake, LockKeyhole, ShieldCheck, Target } from 'lucide-react'
import { MarketingFooter, MarketingNav } from '@/components/marketing-nav'

export default function AboutPage() {
  return (
    <div className="marketing-page">
      <MarketingNav />
      <main>
        <section className="public-page-hero">
          <p className="eyebrow">About PhishSafe</p>
          <h1>Security awareness without the fear tactics.</h1>
          <p>
            We designed PhishSafe as a transparent, educational platform where simulations are authorized,
            administrators stay in control, and employees are taught—not tricked for a score.
          </p>
        </section>
        <section className="about-grid">
          <article>
            <Target size={22} />
            <h2>Our purpose</h2>
            <p>
              Help organizations turn everyday decisions into stronger security habits through realistic,
              responsible practice.
            </p>
          </article>
          <article>
            <LockKeyhole size={22} />
            <h2>Privacy first</h2>
            <p>
              We record learning events, never submitted passwords. Training should improve trust, not
              undermine it.
            </p>
          </article>
          <article>
            <HeartHandshake size={22} />
            <h2>Human centered</h2>
            <p>Clear learning pages explain warning signs immediately and give employees useful next steps.</p>
          </article>
          <article>
            <ShieldCheck size={22} />
            <h2>Built-in governance</h2>
            <p>Campaigns cannot send until an administrator reviews the content and authorized recipient group.</p>
          </article>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
