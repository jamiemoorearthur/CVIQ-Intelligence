const BASE_URL = 'https://cvreview-api.duckdns.org'

export async function reviewCV(file, jobDescription) {
  const formData = new FormData()
  formData.append('cv_file', file)
  formData.append('job_description', jobDescription)
  const res = await fetch(`${BASE_URL}/review`, { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const error = new Error(err.detail || 'Review failed')
    error.response = { status: res.status, data: err }
    throw error
  }
  return res.json()
}

export async function atsPreview(file, jobDescription) {
  const formData = new FormData()
  formData.append('cv_file', file)
  formData.append('job_description', jobDescription)
  const res = await fetch(`${BASE_URL}/ats-preview`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error('ATS preview failed')
  return res.json()
}

export async function chatWithCV({ message, cvText, jobDescription, history }) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, cv_text: cvText, job_description: jobDescription, history }),
  })
  if (!res.ok) throw new Error('Chat failed')
  return res.json()
}

export async function rewriteBullet(bullet, jobDescription) {
  const res = await fetch(`${BASE_URL}/rewrite-bullet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bullet, job_description: jobDescription }),
  })
  if (!res.ok) throw new Error('Rewrite failed')
  return res.json()
}

export async function downloadEditedCV(cvFile, result, format) {
  const binary = atob(cvFile.base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: cvFile.type })
  const file = new File([blob], cvFile.name, { type: cvFile.type })
  const formData = new FormData()
  formData.append('cv_file', file)
  formData.append('suggested_bullets', JSON.stringify(result.suggested_bullets || []))
  formData.append('missing_keywords', JSON.stringify(result.missing_keywords || []))
  formData.append('section_recommendations', JSON.stringify(result.section_recommendations || []))
  const res = await fetch(`${BASE_URL}/download?format=${format}`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error('Download failed')
  const fileBlob = await res.blob()
  const url = URL.createObjectURL(fileBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `edited_cv.${format}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
