'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

function record(action: string, path: string, label?: string) {
  void fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, path, label: label?.slice(0, 160) }),
    keepalive: true,
  })
}

export function ActivityTracker() {
  const pathname = usePathname()
  useEffect(() => { record('page_view', pathname) }, [pathname])
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const element = (event.target as HTMLElement | null)?.closest('a,button') as HTMLElement | null
      if (!element || element.dataset.noAudit === 'true') return
      const label = element.getAttribute('aria-label') || element.textContent?.replace(/\s+/g, ' ').trim() || element.tagName
      const href = element instanceof HTMLAnchorElement ? element.getAttribute('href') : null
      record('click', href || window.location.pathname, label)
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])
  return null
}
