'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { LogoIcon } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { useState } from 'react'

export function MarketingNav() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <header className="marketing-nav">
        <Link href="/" className="brand marketing-brand">
          <LogoIcon size={44} idSuffix="marketing-nav" />
          <span>
            Phish<span>Safe</span>
          </span>
        </Link>
        <nav>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/features">Features</Link>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/trust">Trust center</Link>
        </nav>
        <div>
          <span className="marketing-theme">
            <ThemeToggle />
          </span>
          <Link href="/login" className="marketing-login">
            Sign in
          </Link>
          <Link href="/login" className="button primary">
            Get started
          </Link>
          <button
            type="button"
            className="marketing-menu-button"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      {open && (
        <div className="marketing-mobile-menu">
          <Link href="/how-it-works" onClick={() => setOpen(false)}>
            How it works
          </Link>
          <Link href="/features" onClick={() => setOpen(false)}>
            Features
          </Link>
          <Link href="/about" onClick={() => setOpen(false)}>
            About
          </Link>
          <Link href="/pricing" onClick={() => setOpen(false)}>
            Pricing
          </Link>
          <Link href="/trust" onClick={() => setOpen(false)}>
            Trust center
          </Link>
          <Link href="/login" onClick={() => setOpen(false)}>
            Sign in
          </Link>
        </div>
      )}
    </>
  )
}

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div>
        <span className="brand">
          <LogoIcon size={30} idSuffix="marketing-footer" />
          <span>
            Phish<span>Safe</span>
          </span>
        </span>
        <p>Authorized simulations. Safer human habits.</p>
      </div>
      <div>
        <Link href="/how-it-works">How it works</Link>
        <Link href="/features">Features</Link>
        <Link href="/about">About</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/trust">Trust center</Link>
        <Link href="/login">Sign in</Link>
      </div>
      <span>© 2026 PhishSafe</span>
    </footer>
  )
}
