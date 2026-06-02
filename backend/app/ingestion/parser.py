from pypdf import PdfReader
from io import BytesIO

def extract_text_from_pdf(file_bytes: bytes) -> str:
    pdf_reader = PdfReader(BytesIO(file_bytes))
    text = ""

    for page in pdf_reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text

    return text