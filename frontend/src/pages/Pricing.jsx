import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import { createCheckoutSession } from '../api/stripe'
import { supabase } from '../utils/supabase'
import { useAuth } from '../utils/useAuth'
import '../styles/Pricing.css'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export default function Pricing() {
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [error, setError] = useState(null)
  const { user, isPro, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // fetchClientSecret is called by Stripe.js once the embedded checkout mounts
  const fetchClientSecret = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const { clientSecret } = await createCheckoutSession(token)
    return clientSecret
  }, [])

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret])

  const handleUpgradeClick = () => {
    if (!user) {
      navigate('/login', { state: { from: '/pricing' } })
      return
    }
    setError(null)
    setCheckoutOpen(true)
  }

  return (
    <div className="pricing-page">
      <nav className="pricing-nav">
        <div className="pricing-logo" onClick={() => navigate('/')}>
          CV<span className="pricing-logo-accent">IQ</span>
        </div>
      </nav>

      <div className="pricing-container">
        <div className="pricing-header">
          <div className="pricing-eyebrow">Pricing</div>
          <h1 className="pricing-h1">Get the full picture</h1>
          <p className="pricing-sub">
            Unlock AI-rewritten bullets, line-by-line feedback, deep ATS analysis, and unlimited chat with CVIQ.
          </p>
        </div>

        <div className="pricing-card">
          <div className="pricing-card-plan">Pro</div>
          <div className="pricing-card-price">
            £15<span className="pricing-card-period">/mo</span>
          </div>
          <ul className="pricing-card-features">
            <li>AI-rewritten profile summary</li>
            <li>Bullet point rewrites</li>
            <li>Line-by-line feedback</li>
            <li>Detailed ATS keyword scan</li>
            <li>Unlimited "Ask CVIQ" chat</li>
          </ul>

          {authLoading ? null : isPro ? (
            <div className="pricing-already-pro">You're already on Pro — thanks for subscribing!</div>
          ) : (
            <button className="pricing-cta" onClick={handleUpgradeClick}>
              Upgrade to Pro →
            </button>
          )}

          {error && <div className="pricing-error">{error}</div>}
        </div>
      </div>

      {checkoutOpen && (
        <div className="checkout-modal-backdrop" onClick={() => setCheckoutOpen(false)}>
          <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
            <button className="checkout-close" onClick={() => setCheckoutOpen(false)}>✕</button>
            <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      )}
    </div>
  )
}