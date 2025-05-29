FROM python:3.11-slim

WORKDIR /app
COPY . .

RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    google-cloud-firestore \
    google-cloud-translate \
    python-multipart \
    python-dotenv \
    google-cloud-storage \
    google-cloud-texttospeech \
    google-cloud-pubsub

ENV GOOGLE_APPLICATION_CREDENTIALS=/app/serviceAccount.json

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
