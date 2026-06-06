FROM python:3.11-slim

WORKDIR /app

# Copy and install dependencies first — lets Docker cache this layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy language model required by Presidio PII detection
RUN python -m spacy download en_core_web_sm

# Copy the rest of the backend code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
