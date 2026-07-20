import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import Upload from './pages/Upload'
import Results from './pages/Results'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Pricing from './pages/Pricing'
import Return from './pages/Return'
import Settings from './pages/Settings'

// Apply theme before first render to avoid flash
const stored = localStorage.getItem('cviq:theme')
const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
document.documentElement.setAttribute('data-theme', stored || (systemDark ? 'dark' : 'light'))

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/results" element={<Results />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/return" element={<Return />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
