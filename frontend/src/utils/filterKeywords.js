// pdf.js text extraction for keyword filtering
async function getPdfJs() {
   const pdfjsLib = await import('pdfjs-dist')
   pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
     'pdfjs-dist/build/pdf.worker.min.js',
     import.meta.url
   ).toString()
   return pdfjsLib
 }
 
 export async function extractCvText(fileBase64, fileType) {
   const binary = atob(fileBase64)
   const bytes = new Uint8Array(binary.length)
   for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
 
   if (fileType === 'application/pdf') {
     const pdfjsLib = await getPdfJs()
     const doc = await pdfjsLib.getDocument({ data: bytes }).promise
     let text = ''
     for (let i = 1; i <= doc.numPages; i++) {
       const page = await doc.getPage(i)
       const content = await page.getTextContent()
       text += content.items.map(item => item.str).join(' ') + '\n'
     }
     return text
   } else {
     const mammoth = await import('mammoth').then(m => m.default || m)
     const arrayBuffer = bytes.buffer
     const result = await mammoth.extractRawText({ arrayBuffer })
     return result.value
   }
 }
 
 export function filterTrulyMissing(keywords, cvText) {
   if (!cvText) return keywords
   const lowerText = cvText.toLowerCase()
   return keywords.filter(kw => !lowerText.includes(kw.toLowerCase()))
 }