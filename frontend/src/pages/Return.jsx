import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessionStatus } from '../api/stripe'
import '../styles/Return.css'

export default function Return() {
  const navigate = useNavigate()
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')

    if (!sessionId) {
      setState('error')
      setMessage('Missing checkout session — please try upgrading again.')
      return
    }

    getSessionStatus(sessionId)
      .then(({ status }) => {
        if (status === 'complete') {
          let returnPath = '/'
          try {
            const saved = localStorage.getItem('cviq:upgrade-return')
            if (saved) {
              returnPath = saved
              localStorage.removeItem('cviq:upgrade-return')
            }
          } catch {}
          navigate(`${returnPath}?payment=success`, { replace: true })
        } else if (status === 'open') {
          navigate('/pricing', { replace: true })
        } else {
          setState('error')
          setMessage(`Unexpected checkout status: ${status}`)
        }
      })
      .catch((err) => {
        setState('error')
        setMessage(err.message)
      })
  }, [navigate])

  if (state === 'error') {
    return (
      <div className="return-page">
        <p className="return-title">We couldn't confirm your payment</p>
        <p className="return-message">{message}</p>
        <button className="return-btn" onClick={() => navigate('/pricing')}>Back to pricing</button>
      </div>
    )
  }

  return (
    <div className="return-page">
      <div className="return-spinner" />
      <p className="return-title">Confirming your payment…</p>
    </div>
  )
}