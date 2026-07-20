import { useState, useEffect } from 'react'

const THEME_KEY = 'cviq:theme'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // 1. Check localStorage for explicit user preference
    try {
      const stored = localStorage.getItem(THEME_KEY)
      if (stored === 'dark' || stored === 'light') return stored
    } catch {}
    // 2. Fall back to system preference
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
    return 'light'
  })

  // Apply to <html> whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Listen for system preference changes (only if user hasn't set a preference)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      try {
        const stored = localStorage.getItem(THEME_KEY)
        if (!stored) setTheme(e.matches ? 'dark' : 'light')
      } catch {}
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(THEME_KEY, next) } catch {}
      return next
    })
  }

  const setThemeExplicit = (t) => {
    setTheme(t)
    try { localStorage.setItem(THEME_KEY, t) } catch {}
  }

  return { theme, toggleTheme, setTheme: setThemeExplicit }
}