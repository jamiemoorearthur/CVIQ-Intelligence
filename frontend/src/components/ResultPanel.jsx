import { useEffect, useState, useRef } from 'react'
import { chatWithCV } from '../api/api'
import Loading from './Loading'

export default function ResultPanel({ cvText, jobDescription, open, onClose }) {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [msgs, loading])
  const send = async () => {
    const msg = input.trim(); if (!msg || loading) return
    setInput(''); const history = [...msgs, {role:'user',content:msg}]; setMsgs(history); setLoading(true)
    try { const res = await chatWithCV({message:msg, cvText, jobDescription, history:msgs}); setMsgs([...history, {role:'assistant',content:res.response}]) }
    catch { setMsgs([...history, {role:'assistant',content:'Something went wrong. Please try again.'}]) }
    finally { setLoading(false) }
  }
  if (!open) return null
  const prompts = ['Why is my recruiter score low?','What would improve my ATS score fastest?','Which bullet point is weakest?','How can I tailor this CV further?']
  return (
    <div className="chat-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="chat-panel">
        <div className="chat-top">
          <div>
            <div className="chat-title">Ask CVIQ</div>
            <div className="chat-subtitle">I'm looking at your CV and job description. Ask anything.</div>
          </div>
          <button className="chat-x" onClick={onClose}>✕</button>
        </div>
        <div className="chat-msgs">
          {msgs.length===0 && <div className="chat-prompts">{prompts.map(p=><button key={p} className="chat-prompt" onClick={()=>setInput(p)}>{p}</button>)}</div>}
          {msgs.map((m,i)=>(
            <div key={i} className={`chat-msg ${m.role==='user'?'chat-msg-user':'chat-msg-ai'}`}>
              {m.role==='assistant'&&<div className="chat-ai-label">CVIQ</div>}
              <div className="chat-msg-text">{m.content}</div>
            </div>
          ))}
          {loading && <div className="chat-msg chat-msg-ai"><div className="chat-ai-label">CVIQ</div><Loading variant="dots" /></div>}
          <div ref={bottomRef}/>
        </div>
        <div className="chat-input-wrap">
          <input className="chat-input" placeholder="Ask your recruiter..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} disabled={loading}/>
          <button className="chat-send" onClick={send} disabled={loading||!input.trim()}>Send</button>
        </div>
        <div className="chat-note">Responses take 10–20 seconds — running on a local model</div>
      </div>
    </div>
  )
}