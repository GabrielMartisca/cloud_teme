import json
from typing import List, Optional
from fastapi import FastAPI, File, HTTPException, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage
from google.cloud import firestore
from datetime import datetime
from pydantic import BaseModel
import uuid
import os
from google.cloud import vision
import requests
import json
from google.cloud import language_v1
from google.cloud import translate_v2 as translate


app = FastAPI()

# Allow all origins (you can restrict this to a specific domain if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

client = language_v1.LanguageServiceClient()
vision_client = vision.ImageAnnotatorClient()
translate_client = translate.Client()

# GCP Clients
storage_client = storage.Client(project="temacloud-456115")
bucket_name = "travel-journal-uploads"
bucket = storage_client.bucket(bucket_name)

db = firestore.Client(
    project="temacloud-456115",  # Your GCP project ID
    database="travel-journal-db"  # ⚠️ Replace with your actual DB name (NOT "(default)")
)

# Pydantic model for post data
class PostData(BaseModel):
    image_url: str
    caption: str
    language: str
    labels: Optional[List[str]] = []   # <-- Add this


def analyze_sentiment(text: str):
    # Prepare the document for sentiment analysis
    document = language_v1.Document(content=text, type_=language_v1.Document.Type.PLAIN_TEXT)
    
    # Get the sentiment analysis result
    sentiment = client.analyze_sentiment(request={'document': document}).document_sentiment
    
    # Return sentiment score and magnitude
    return sentiment.score, sentiment.magnitude

def translate_text(text: str, target_language: str = 'en'):
    # Translate the text to the target language
    result = translate_client.translate(text, target_language=target_language)
    
    # Return the translated text
    return result['translatedText']

@app.get("/translate/{target_language}")
def translate_caption(caption: str, target_language: str):
    try:
        translated_caption = translate_text(caption, target_language)
        return {"translated_caption": translated_caption}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Translation failed: " + str(e))
    
@app.delete("/delete_post/{post_id}")
async def delete_post(post_id: str):
    try:
        # Reference to the post document in Firestore
        post_ref = db.collection("posts").document(post_id)
        
        # Delete the post
        post_ref.delete()

        return {"message": "Post deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error deleting post: " + str(e))

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    blob_name = f"{uuid.uuid4()}_{file.filename}"
    blob = bucket.blob(blob_name)

    contents = await file.read()
    blob.upload_from_string(contents, content_type=file.content_type)
    blob.make_public()

    # Vision API - detect labels
    image = vision.Image(content=contents)
    response = vision_client.label_detection(image=image)
    labels = [label.description for label in response.label_annotations]
    print("Detected labels:", labels)

    return {
        "image_url": blob.public_url,
        "labels": labels
    }

@app.post("/create_post/")
def create_post(post: PostData):
    try:
        # Analyze sentiment of the caption
        sentiment_score, sentiment_magnitude = analyze_sentiment(post.caption)

        # Now, store the sentiment score along with the post data
        doc_ref = db.collection("posts").document()
        created_at = firestore.SERVER_TIMESTAMP

        doc_ref.set({
            "image_url": post.image_url,
            "caption": post.caption,
            "language": post.language,
            "labels": post.labels,  # Add labels
            "sentiment_score": sentiment_score,  # Add sentiment score
            "sentiment_magnitude": sentiment_magnitude,  # Add sentiment magnitude
            "created_at": created_at
        })

        return {"message": "Post saved successfully with sentiment analysis"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Fetch all posts
@app.get("/posts/")
def get_posts():
    posts_ref = db.collection("posts").order_by("created_at", direction=firestore.Query.DESCENDING)
    docs = list(posts_ref.stream())
    
    if not docs:
        return []  # Return empty list if no posts

    return [{"id": doc.id, **doc.to_dict()} for doc in docs]
