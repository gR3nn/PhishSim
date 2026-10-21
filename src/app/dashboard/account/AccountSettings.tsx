'use client'

import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound, Save, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AccountSettings({ id, initialName }: { id: string; initialName: string }) {
  const [name, setName] = useState(initialName)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setProfileMessage('')
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', id)
    setProfileMessage(error ? error.message : 'Profile details updated.')
    setSaving(false)
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault(); setPasswordMessage('')
    if (password.length < 8) return setPasswordMessage('Use at least 8 characters.')
    if (password !== confirmPassword) return setPasswordMessage('The passwords do not match.')
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setPasswordMessage(error ? error.message : 'Password changed successfully.')
    if (!error) { setPassword(''); setConfirmPassword('') }
    setSaving(false)
  }

  return <div className="settings-grid">
    <form className="form-card" onSubmit={saveProfile}>
      <section className="form-section"><div className="settings-title"><span><UserRound size={19}/></span><div><h2>Personal details</h2><p>Update the name shown around your workspace.</p></div></div><div className="form-grid"><div className="field full"><label htmlFor="fullName">Full name</label><input id="fullName" value={name} onChange={(event) => setName(event.target.value)} required/></div></div>{profileMessage && <p className="inline-message"><CheckCircle2 size={14}/>{profileMessage}</p>}</section>
      <div className="form-actions"><button className="button primary" disabled={saving}><Save size={15}/>{saving ? 'Saving…' : 'Save details'}</button></div>
    </form>
    <form className="form-card" onSubmit={changePassword}>
      <section className="form-section"><div className="settings-title"><span><KeyRound size={19}/></span><div><h2>Change password</h2><p>Choose a unique password with at least 8 characters.</p></div></div><div className="form-grid"><div className="field full"><label htmlFor="newPassword">New password</label><div className="password-field"><input id="newPassword" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8}/><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></div><div className="field full"><label htmlFor="confirmPassword">Confirm new password</label><input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8}/></div></div>{passwordMessage && <p className="inline-message"><CheckCircle2 size={14}/>{passwordMessage}</p>}</section>
      <div className="form-actions"><button className="button primary" disabled={saving}><KeyRound size={15}/>{saving ? 'Updating…' : 'Update password'}</button></div>
    </form>
  </div>
}
