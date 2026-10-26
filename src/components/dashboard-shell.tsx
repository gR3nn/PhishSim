'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Bell, CheckCircle2, ChevronRight, Clock3, CreditCard, FileText, Headphones, History, LayoutDashboard, LogOut, Menu, Send, ShieldCheck, Sparkles, Users, WalletCards, X } from 'lucide-react'
import { LogoIcon } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { ROLE_LABELS, type AppRole } from '@/lib/authz'
import { ActivityTracker } from '@/components/activity-tracker'

type NavItem = { href: string; label: string; icon: React.ElementType; roles?: AppRole[]; section: 'workspace' | 'build' }
export type AppNotification = { id: string; title: string; detail: string; createdAt: string; type: 'pending' | 'approved' | 'rejected' }

const navigation: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['client','admin','campaign_manager','auditor'], section: 'workspace' },
  { href: '/dashboard/campaigns/create', label: 'New Campaign', icon: Send, roles: ['client','admin','campaign_manager'], section: 'workspace' },
  { href: '/dashboard/requests', label: 'Pending Campaigns', icon: ShieldCheck, roles: ['admin','campaign_manager'], section: 'workspace' },
  { href: '/dashboard/services', label: 'Billing & wallet', icon: CreditCard, roles: ['client'], section: 'workspace' },
  { href: '/dashboard/support', label: 'Support', icon: Headphones, section: 'workspace' },
  { href: '/dashboard/logs', label: 'Activity logs', icon: History, roles: ['admin','campaign_manager'], section: 'workspace' },
  { href: '/dashboard/groups', label: 'Groups', icon: Users, roles: ['client','admin','campaign_manager'], section: 'build' },
  { href: '/dashboard/templates', label: 'Templates', icon: FileText, roles: ['client','admin','campaign_manager'], section: 'build' },
  { href: '/dashboard/landing-pages', label: 'Landing pages', icon: Sparkles, roles: ['client','admin','campaign_manager'], section: 'build' },
  { href: '/dashboard/users', label: 'Users', icon: Users, roles: ['admin','campaign_manager'], section: 'build' },
]

export function DashboardShell({ children, email, name, role, notifications, creditCents = 0 }: { children: React.ReactNode; email: string; name: string; role: AppRole; notifications: AppNotification[]; creditCents?: number }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const items = navigation.filter((item) => !item.roles || item.roles.includes(role))
  const workspaceItems = items.filter((item) => item.section === 'workspace')
  const buildItems = items.filter((item) => item.section === 'build')

  const sidebar = (
    <>
      <div className="brand-block">
        <Link href="/dashboard" className="brand" onClick={() => setOpen(false)}>
          <LogoIcon size={34} idSuffix="sidebar" />
          <span>Phish<span>Safe</span></span>
        </Link>
        <button type="button" className="mobile-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={20} /></button>
      </div>
      <nav className="side-nav" aria-label="Dashboard navigation">
        <p className="nav-eyebrow">Workspace</p>
        {workspaceItems.map((item) => <NavItem key={item.href} item={item} pathname={pathname} close={() => setOpen(false)} />)}
        <p className="nav-eyebrow nav-section">Build</p>
        {buildItems.map((item) => <NavItem key={item.href} item={item} pathname={pathname} close={() => setOpen(false)} />)}
      </nav>
      <div className="sidebar-foot">
        <div className="sidebar-status"><span className="status-dot" /> Systems operational</div>
        <Link href="/dashboard/account" className="account-card account-link" onClick={() => setOpen(false)}>
          <div className="avatar">{name.charAt(0).toUpperCase()}</div>
          <div className="account-copy"><strong>{name}</strong><span>{ROLE_LABELS[role]} · {email}</span></div>
          <ChevronRight size={16}/>
        </Link>
        <form action="/auth/signout" method="post"><button type="submit" className="sidebar-signout"><LogOut size={15}/> Sign out</button></form>
      </div>
    </>
  )

  return (
    <div className="app-shell">
      <ActivityTracker />
      <aside className="desktop-sidebar">{sidebar}</aside>
      {open && <button type="button" className="mobile-backdrop" onClick={() => setOpen(false)} aria-label="Close menu" />}
      <aside className={`mobile-sidebar ${open ? 'is-open' : ''}`}>{sidebar}</aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <div className="topbar-heading"><p className="topbar-kicker">Security awareness platform</p><p className="topbar-title">Welcome back, {name.split(' ')[0]}</p></div>
          </div>
          <div className="topbar-actions">
            {role === 'client' && <Link href="/dashboard/services" className="credit-pill"><WalletCards size={15}/><span>€{(creditCents / 100).toFixed(2)}</span></Link>}
            <span className={`role-pill ${role}`}><span />{ROLE_LABELS[role]}</span>
            <ThemeToggle />
            <div className="notification-wrap">
              <button type="button" className="icon-button notification" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={18} />{notifications.length > 0 && <span />}</button>
              {notificationsOpen && <div className="notification-menu">
                <div className="notification-head"><div><strong>Notifications</strong><span>{notifications.length} update{notifications.length === 1 ? '' : 's'}</span></div><button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={16}/></button></div>
                <div className="notification-list">{notifications.length === 0 ? <div className="notification-empty"><Bell size={20}/><strong>You’re all caught up</strong><span>Campaign updates will appear here.</span></div> : notifications.map((item) => <Link href={role === 'admin' || role === 'campaign_manager' ? `/dashboard/requests/${item.id}` : `/dashboard/campaigns/${item.id}`} className="notification-item" key={item.id} onClick={() => setNotificationsOpen(false)}><span className={`notification-type ${item.type}`}>{item.type === 'approved' ? <CheckCircle2 size={15}/> : item.type === 'rejected' ? <X size={15}/> : <Clock3 size={15}/>}</span><span><strong>{item.title}</strong><small>{item.detail}</small><time>{new Date(item.createdAt).toLocaleDateString()}</time></span></Link>)}</div>
                <Link className="notification-footer" href={role === 'admin' || role === 'campaign_manager' ? '/dashboard/requests' : '/dashboard'} onClick={() => setNotificationsOpen(false)}>View campaign activity <ArrowIcon/></Link>
              </div>}
            </div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}

function ArrowIcon() { return <ChevronRight size={14}/> }

function NavItem({ item, pathname, close }: { item: NavItem; pathname: string; close: () => void }) {
  const Icon = item.icon
  const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)
  return <Link className={`nav-link ${active ? 'active' : ''}`} href={item.href} onClick={close}><Icon size={18} /><span>{item.label}</span>{active && <ChevronRight className="nav-arrow" size={15} />}</Link>
}
