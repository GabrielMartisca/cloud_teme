###### local testing
cd backend


.\venv\Scripts\activate


uvicorn main:app --reload

open index.html in your browser


##### push to host

cd backend-> gcloud run deploy chess-backend --source . --region europe-west1 --allow-unauthenticated


cd frontend-> firebase deploy
