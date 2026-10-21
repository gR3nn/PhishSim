'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, BarChart3, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  async function handleAuth(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(null); setMessage(null)
    const supabase = createClient()
    if (isSignUp) {
      const { error: authError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } })
      if (authError) setError(authError.message); else setMessage('Check your inbox to confirm your new workspace account.')
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) setError(authError.message); else { router.push('/dashboard'); router.refresh() }
    }
    setLoading(false)
  }

  async function handleGoogleLogin() {
    const supabase = createClient()
    setLoading(true); setError(null)
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback` } })
    if (authError) { setError(authError.message); setLoading(false) }
  }

  async function handleForgotPassword() {
    setError(null); setMessage(null)
    if (!email) return setError('Enter your email address first, then select “Forgot password?”.')
    setLoading(true)
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/dashboard/account` })
    if (resetError) setError(resetError.message)
    else setMessage('Password-reset instructions were sent to your email.')
    setLoading(false)
  }

  return <main className="auth-page">
    <section className="auth-story">
      <div className="auth-orb orb-one"/><div className="auth-orb orb-two"/>
      <Link className="brand auth-brand" href="/"><span className="brand-mark"><ShieldCheck size={21}/></span><span>Phish<span>Safe</span></span></Link>
      <div className="auth-story-copy"><p className="eyebrow">Human-first security</p><h1>Turn risky clicks into <em>safer instincts.</em></h1><p>Plan ethical phishing simulations, protect every send with administrator approval, and see where training makes a difference.</p><ul><li><Check size={16}/> Permission-based campaign workflow</li><li><Check size={16}/> Live, privacy-conscious analytics</li><li><Check size={16}/> One login, role-aware experience</li></ul></div>
      <div className="auth-preview"><div><BarChart3 size={18}/><span><strong>+24%</strong><small>awareness growth</small></span></div><div className="preview-bars"><i/><i/><i/><i/><i/></div></div>
      <p className="auth-copyright">© 2026 PhishSafe · Educational security platform</p>
    </section>
    <section className="auth-form-side">
      <div className="auth-form-wrap">
        <p className="auth-mobile-brand"><ShieldCheck size={20}/> PhishSafe</p>
        <p className="eyebrow">{isSignUp ? 'Create workspace access' : 'Welcome back'}</p>
        <h2>{isSignUp ? 'Create your account' : 'Sign in to your workspace'}</h2>
        <p className="auth-intro">{isSignUp ? 'Join as a client. Administrators are recognized automatically.' : 'The same secure login works for clients and administrators.'}</p>
        <form onSubmit={handleAuth} className="auth-form">
          <div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com"/></div>
          <div className="field"><div className="label-row"><label htmlFor="password">Password</label>{!isSignUp && <button type="button" onClick={handleForgotPassword} disabled={loading}>Forgot password?</button>}</div><div className="password-field"><input id="password" type={showPassword ? 'text' : 'password'} minLength={6} required autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters"/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div>
          {error && <div className="auth-message error">{error}</div>}{message && <div className="auth-message success">{message}</div>}
          <button className="auth-submit" disabled={loading}>{loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}<ArrowRight size={17}/></button>
        </form>
        <div className="auth-divider"><span>or continue with</span></div>
        <button className="google-button" onClick={handleGoogleLogin} disabled={loading}><span>G</span>{loading ? 'Connecting…' : 'Google'}</button>
        <p className="auth-switch">{isSignUp ? 'Already have an account?' : 'New to PhishSafe?'} <button onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null) }}>{isSignUp ? 'Sign in' : 'Create an account'}</button></p>
      </div>
    </section>
  </main>
}
