# main.py
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage, firestore
from uuid import uuid4
import os

app = FastAPI()

# CORS so Angular can talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Google clients
storage_client = storage.Client()
firestore_client = firestore.Client()
bucket_name = "your-bucket-name"  # 🔥 replace later

@app.post("/posts")
async def create_post(
    description: str = Form(...),
    location: str = Form(...),
    image: UploadFile = File(...)
):
    # Upload image to Cloud Storage
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(f"images/{uuid4()}-{image.filename}")
    blob.upload_from_file(image.file, content_type=image.content_type)
    blob.make_public()

    # Store metadata in Firestore
    doc_ref = firestore_client.collection("posts").document()
    doc_ref.set({
        "description": description,
        "location": location,
        "image_url": blob.public_url
    })

    return {"message": "Post created!", "image_url": blob.public_url}
