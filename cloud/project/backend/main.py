import os
from fastapi import FastAPI
from google.cloud import translate_v2 as translate
from pydantic import BaseModel
from google.cloud import firestore
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from google.cloud import texttospeech
from fastapi.responses import StreamingResponse
from google.cloud import pubsub_v1
from fastapi import UploadFile, File
from google.cloud import storage
from fastapi import Body
from datetime import timedelta



# Set credentials
#os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "serviceAccount.json"
storage_client = storage.Client()
bucket_name = "study-notes-bucket"
bucket = storage_client.bucket(bucket_name)
app = FastAPI()

db = firestore.Client()



# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*","null"],  # for development, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Google Translate client
translate_client = translate.Client()
publisher = pubsub_v1.PublisherClient()
project_id = "perfect-entry-460411-v0"

# Data models
class TranslationRequest(BaseModel):
    text: str
    target: str


class Post(BaseModel):
    title: str
    description: str
    lat: float
    lng: float




def get_voice_name(lang_code):
    voices = {
        "en": "en-US-Standard-C",
        "ro": "ro-RO-Standard-A",
        "fr": "fr-FR-Standard-A",
        "es": "es-ES-Standard-A",
        "de": "de-DE-Standard-A",
        "it": "it-IT-Standard-A"
    }
    return voices.get(lang_code, f"{lang_code}-Standard-A")



# Routes

@app.get("/debug_firestore")
def debug_firestore():
    try:
        db.collection("test").add({"ping": "pong"})
        return {"status": "OK"}
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print("AAAAAAAAAA Firestore error:", e)
        print(tb)
        return {
            "error": str(e),
            "traceback": tb
        }



@app.get("/")
def read_root():
    return {"message": "Backend is working!"}

@app.post("/translate")
def translate_text(request: TranslationRequest):
    result = translate_client.translate(request.text, target_language=request.target)
    return {"translated_text": result["translatedText"]}


@app.post("/add_post")
def add_post(post: Post):
    doc_ref = db.collection("posts").add(post.dict())
    return {"message": "Post added", "id": doc_ref[1].id}

@app.get("/posts")
def get_posts():
    posts_ref = db.collection("posts").stream()
    return [{**doc.to_dict(), "id": doc.id} for doc in posts_ref]

@app.post("/speak")
def speak_text(req: TranslationRequest):
    client = texttospeech.TextToSpeechClient()

    synthesis_input = texttospeech.SynthesisInput(text=req.text)

    voice = texttospeech.VoiceSelectionParams(
        language_code=req.target,
        name=get_voice_name(req.target)
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )

    return StreamingResponse(
        iter([response.audio_content]),
        media_type="audio/mpeg"
    )


@app.post("/upload_note")
async def upload_note(file: UploadFile = File(...)):
    blob = bucket.blob(file.filename)
    blob.upload_from_file(file.file, content_type=file.content_type)
    return {"message": "Note uploaded", "filename": file.filename}

@app.get("/notes")
def list_notes():
    blobs = bucket.list_blobs()
    return [{"name": blob.name, "url": blob.public_url} for blob in blobs]

@app.post("/save_note")
def save_note(note: str = Body(...)):
    db.collection("notes").document("shared_note").set({"content": note})
    return {"message": "Note saved"}

@app.get("/get_note")
def get_note():
    doc = db.collection("notes").document("shared_note").get()
    if doc.exists:
        return {"content": doc.to_dict()["content"]}
    return {"content": ""}

@app.post("/upload_file")
async def upload_file(file: UploadFile = File(...)):
    blob = bucket.blob(file.filename)
    blob.upload_from_file(file.file, content_type=file.content_type)

    signed_url = blob.generate_signed_url(expiration=timedelta(hours=1))

    return {"message": "File uploaded", "url": signed_url}


@app.get("/files")
def list_files():
    blobs = bucket.list_blobs()
    return [
        {
            "name": blob.name,
            "url": blob.generate_signed_url(expiration=timedelta(hours=1))
        }
        for blob in blobs
    ]



if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))  
    uvicorn.run("main:app", host="0.0.0.0", port=port)
