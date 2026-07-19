import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../utils/useAuth'
import '../styles/Settings.css'

const BASE_URL = 'https://cvreview-api.duckdns.org'

export default function Settings() {
  const navigate = useNavigate()
  const { user, isPro, loading: authLoading } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  if (authLoading) return null
  if (!user) {
    navigate('/login')
    return null
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch(`${BASE_URL}/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        await supabase.auth.signOut()
        navigate('/')
      } else {
        setError('Something went wrong. Please try again or contact support.')
        setDeleting(false)
      }
    } catch {
      setError('Something went wrong. Please try again or contact support.')
      setDeleting(false)
    }
  }

  return (
    <div className="settings-page">
      <nav className="settings-nav">
        <div className="settings-nav-inner">
          <div className="settings-logo" onClick={() => navigate('/')}>
            CV<span className="settings-logo-accent">IQ</span>
          </div>
          <div className="settings-nav-right">
            <button className="settings-nav-btn" onClick={() => navigate(-1)}>← Back</button>
            <button className="settings-nav-btn" onClick={async () => { await supabase.auth.signOut(); navigate('/') }}>Sign out</button>
          </div>
        </div>
      </nav>

      <div className="settings-container">
        <div className="settings-header">
          <div className="settings-eyebrow">Account</div>
          <h1 className="settings-h1">Settings</h1>
        </div>

        {/* Account info */}
        <div className="settings-card">
          <div className="settings-card-label">Account details</div>
          <div className="settings-row">
            <span className="settings-row-key">Email</span>
            <span className="settings-row-val">{user.email}</span>
          </div>
          <div className="settings-row">
            <span className="settings-row-key">Plan</span>
            <span className="settings-row-val">
              {isPro
                ? <span className="settings-plan-badge settings-plan-pro">Pro</span>
                : <span className="settings-plan-badge settings-plan-free">Free</span>
              }
            </span>
          </div>
          {!isPro && (
            <div className="settings-upgrade-row">
              <button className="settings-upgrade-btn" onClick={() => navigate('/pricing')}>
                Upgrade to Pro — £15/mo
              </button>
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="settings-card settings-card-danger">
          <div className="settings-card-label settings-card-label-danger">Danger zone</div>
          <div className="settings-danger-row">
            <div>
              <div className="settings-danger-title">Delete account</div>
              <div className="settings-danger-sub">Permanently delete your account and cancel any active subscription.</div>
            </div>
            <button className="settings-delete-btn" onClick={() => setShowModal(true)}>
              Delete account
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {showModal && (
        <div className="settings-modal-backdrop" onClick={() => !deleting && setShowModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-modal-icon">⚠️</div>
            <h2 className="settings-modal-title">Delete your account?</h2>
            <p className="settings-modal-body">
              This will permanently delete your account and cancel any active subscription. This cannot be undone.
            </p>
            {error && <div className="settings-modal-error">{error}</div>}
            <div className="settings-modal-actions">
              <button
                className="settings-modal-cancel"
                onClick={() => setShowModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="settings-modal-confirm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}