import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import '../styles/Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const fromUpload = location.state?.from === '/upload'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return setError('Please enter your email and password.')
    }

    try {
      setLoading(true)
      setError(null)

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Respect intended destination from Pricing page or signup flow
      let dest = location.state?.from || '/'
      try {
        const plan = localStorage.getItem('cviq:intended-plan')
        if (plan === 'pro') {
          localStorage.removeItem('cviq:intended-plan')
          dest = '/pricing'
        }
      } catch {}
      navigate(dest)
    } catch (err) {
      setError(
        err.message ||
          'Sign in failed. Please check your credentials and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <nav className="auth-nav">
        <div className="auth-nav-inner">
          <div className="auth-logo" onClick={() => navigate('/')}>
            <span className="auth-logo-text">
              CV<span className="auth-logo-accent">IQ</span>
            </span>
          </div>
          <Link to="/signup" className="auth-nav-link">
            Create account
          </Link>
        </div>
      </nav>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-eyebrow">Welcome back</div>
          <h1 className="auth-h1">Sign in to CVIQ</h1>
          <p className="auth-sub">
            Access your CV reviews and track your progress.
          </p>

          {fromUpload && (
            <div className="auth-redirect-note">
              You need an account to analyse your CV. Sign in or create one
              free below.
            </div>
          )}

          <div className="auth-form">
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="auth-input"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="current-password"
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              className="auth-btn-submit"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="auth-footer-text">
            Don't have an account? <Link to="/signup">Create one free</Link>
          </div>
        </div>
      </div>

      <footer className="auth-page-footer">
        <div className="auth-page-footer-inner">
          <div className="auth-logo" onClick={() => navigate('/')}>
            <span className="auth-logo-text">
              CV<span className="auth-logo-accent">IQ</span>
            </span>
          </div>
          <p className="auth-page-footer-copy">
            © 2026 CVIQ Inc. · CV Intelligence Platform
          </p>
        </div>
      </footer>
    </div>
  )
}