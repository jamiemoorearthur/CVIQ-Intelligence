import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import '../styles/Auth.css'

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) return setError('Please enter your email and a password.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    try {
      setLoading(true)
      setError(null)
      const { error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
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
            <div className="auth-success">
              <h3>Check your inbox</h3>
              <p>We've sent a confirmation link to <strong>{email}</strong>. Click it to activate your account and get started.</p>
            </div>
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