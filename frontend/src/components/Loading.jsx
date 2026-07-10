
export default function Loading({ variant = 'dots', label }) {
  if (variant === 'text') {
    return <p className="ats-loading">{label}</p>
  }
  return (
    <div className="chat-typing"><span /><span /><span /></div>
  )
}