import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import '../styles/Auth.css'

const INTENDED_PLAN_KEY = 'cviq:intended-plan'

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [planChoice, setPlanChoice] = useState(null) // 'free' | 'pro' | null

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) return setError('Please enter your email and a password.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    try {
      setLoading(true)
      setError(null)
      const { data, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      setSuccess(true)
      // If email confirmation is off, Supabase returns a session immediately.
      // If it's on, data.session will be null until the user confirms.
      setHasSession(!!data.session)
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const choosePlan = (plan) => {
    setPlanChoice(plan)
    if (hasSession) {
      // Already logged in (email confirmation disabled) — go straight there
      navigate(plan === 'pro' ? '/pricing' : '/upload')
      return
    }
    
    try { sessionStorage.setItem(INTENDED_PLAN_KEY, plan) } catch {}
  }

  return (
    <div className="auth-page">
      <nav className="auth-nav">
        <div className="auth-nav-inner">
          <div className="auth-logo" onClick={() => navigate('/')}>
            <span className="auth-logo-text">CV<span className="auth-logo-accent">IQ</span></span>
          </div>
          <Link to="/login" className="auth-nav-link">Sign in</Link>
        </div>
      </nav>

      <div className="auth-container">
        <div className="auth-card">
          {success ? (
            hasSession ? (
              <div className="auth-success">
                <h3>You're all set</h3>
                <p>Choose how you'd like to get started.</p>
                <div className="auth-plan-choice">
                  <button className="auth-plan-btn" onClick={() => choosePlan('free')}>
                    <span className="auth-plan-btn-title">Continue Free</span>
                    <span className="auth-plan-btn-sub">5 CV reviews a month, no card needed</span>
                  </button>
                  <button className="auth-plan-btn auth-plan-btn-pro" onClick={() => choosePlan('pro')}>
                    <span className="auth-plan-btn-title">Continue to Pro — £15/mo</span>
                    <span className="auth-plan-btn-sub">Unlimited reviews, AI rewrites, full ATS scan</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="auth-success">
                <h3>Check your inbox</h3>
                <p>We've sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in below.</p>
                {!planChoice ? (
                  <div className="auth-plan-choice">
                    <button className="auth-plan-btn" onClick={() => choosePlan('free')}>
                      <span className="auth-plan-btn-title">Continue Free</span>
                      <span className="auth-plan-btn-sub">5 CV reviews a month, no card needed</span>
                    </button>
                    <button className="auth-plan-btn auth-plan-btn-pro" onClick={() => choosePlan('pro')}>
                      <span className="auth-plan-btn-title">Continue to Pro — £15/mo</span>
                      <span className="auth-plan-btn-sub">Unlimited reviews, AI rewrites, full ATS scan</span>
                    </button>
                  </div>
                ) : (
                  <p className="auth-plan-confirmed">
                    Got it — once you confirm your email, sign in and we'll take you straight to {planChoice === 'pro' ? 'checkout' : 'your dashboard'}.
                  </p>
                )}
                <Link to="/login" className="auth-btn-submit auth-success-login-link">Go to sign in</Link>
              </div>
            )
          ) : (
            <>
              <div className="auth-eyebrow">Get started free</div>
              <h1 className="auth-h1">Create your account</h1>
              <p className="auth-sub">Start analysing your CV in under 60 seconds. No credit card required.</p>
              <div className="auth-form">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="email">Email address</label>
                  <input id="email" className="auth-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSignup()} autoComplete="email" />
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="password">Password</label>
                  <input id="password" className="auth-input" type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSignup()} autoComplete="new-password" />
                </div>
                {error && <div className="auth-error">{error}</div>}
                <button className="auth-btn-submit" onClick={handleSignup} disabled={loading}>
                  {loading ? 'Creating account...' : 'Create free account'}
                </button>
              </div>
              <div className="auth-footer-text">
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="auth-page-footer">
        <div className="auth-page-footer-inner">
          <div className="auth-logo" onClick={() => navigate('/')}>
            <span className="auth-logo-text">CV<span className="auth-logo-accent">IQ</span></span>
          </div>
          <p className="auth-page-footer-copy">© 2026 CVIQ Inc. · CV Intelligence Platform</p>
        </div>
      </footer>
    </div>
  )
}