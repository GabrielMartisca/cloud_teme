from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from googletrans import Translator
from pydantic import BaseModel, constr, validator
import sqlite3
from typing import List, Optional
import requests
from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt
import logging
import os
from dotenv import load_dotenv

# FastAPI app setup
app = FastAPI()

load_dotenv("tkn.env")  

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Adjust this for production
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers
)

# JWT Configs
SECRET_KEY = os.getenv("SECRET_KEY")
print(f"SECRET_KEY: {SECRET_KEY}")  # Check the value of SECRET_KEY

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Database setup
def get_db():
    conn = sqlite3.connect("data.db")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name TEXT NOT NULL,
                            username TEXT UNIQUE NOT NULL,
                            password TEXT NOT NULL)''')
        cursor.execute('''CREATE TABLE IF NOT EXISTS posts (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL,
                            content TEXT NOT NULL,
                            location TEXT,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)''')
        cursor.execute('''CREATE TABLE IF NOT EXISTS comments (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            post_id INTEGER NOT NULL,
                            user_id INTEGER NOT NULL,
                            content TEXT NOT NULL,
                            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)''')
        conn.commit()

init_db()

# Pydantic models
class UserRegister(BaseModel):
    name: str
    username: str  # Use regex validation in the validator instead
    password: str  # Use regex validation in the validator instead

    @validator("username")
    def validate_username(cls, value):
        if not value.isalnum() or "_" in value:
            raise ValueError("Username must contain only letters, numbers, and underscores")
        if len(value) < 3 or len(value) > 20:
            raise ValueError("Username must be between 3 and 20 characters")
        return value

    @validator("password")
    def validate_password(cls, value):
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must contain at least one digit")
        return value

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None

class TokenData(BaseModel):
    name: str

class Post(BaseModel):
    content: str

class Comment(BaseModel):
    content: str

class TranslateRequest(BaseModel):
    text: str
    target_language: str

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: int = ACCESS_TOKEN_EXPIRE_MINUTES):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_delta)

    # 🔹 Ensure the "sub" field is always a string
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    token = str(token) if token else ""
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload.get("sub")
    print("User id:",user_id)
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, username FROM users WHERE id=?", (user_id,))
            user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": user[0], "username": user[1]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def fetch_query(query: str, params=()):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.fetchall()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def execute_query(query: str, params=()):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            conn.commit()
    except sqlite3.IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"Integrity error: {str(e)}")
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Authentication routes
@app.post("/register")
def register(user: UserRegister):
    hashed_password = hash_password(user.password)
    try:
        execute_query("INSERT INTO users (name, username, password) VALUES (?, ?, ?)", (user.name, user.username, hashed_password))
        return {"message": "User registered"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already exists")

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = fetch_query("SELECT id, password FROM users WHERE username=?", (form_data.username,))
    if not user or not verify_password(form_data.password, user[0][1]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    access_token = create_access_token({"sub": str(user[0][0])})
    return {"access_token": access_token, "token_type": "bearer"}



@app.post("/posts/{post_id}/comments", status_code=201)
def create_comment(post_id: int, comment: Comment, current_user: dict = Depends(get_current_user)):
    execute_query("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)", (post_id, current_user["id"], comment.content))
    return {"message": "Comment created"}
'''
@app.post("/posts", status_code=201)
def create_post(request: Request, post: Post, token: str = Depends(oauth2_scheme)):
    user_id = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])["sub"]
    location = get_location(get_client_ip(request))
    execute_query("INSERT INTO posts (user_id, content, location) VALUES (?, ?, ?)", (user_id, post.content, location))
    return {"message": "Post created", "location": location}
'''
@app.get("/posts", response_model=List[dict])
def get_posts():
    posts = fetch_query("""
        SELECT posts.id, posts.user_id, posts.content, posts.location, users.username 
        FROM posts 
        JOIN users ON posts.user_id = users.id
    """)
    return [
        {"id": post[0], "user_id": post[1], "content": post[2], "location": post[3], "username": post[4]} 
        for post in posts
    ]


@app.get("/users/{user_id}/posts", response_model=List[dict])
def get_user_posts(user_id: int):
    posts = fetch_query("SELECT id, user_id, content FROM posts WHERE user_id=?", (user_id,))
    return [{"id": post[0], "user_id": post[1], "content": post[2]} for post in posts]

@app.get("/posts/{post_id}/comments", response_model=List[dict])
def get_post_comments(post_id: int):
    comments = fetch_query("""
        SELECT c.id, c.post_id, c.content, u.username,c.user_id
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id=?
    """, (post_id,))
    return [{"id": comment[0], "post_id": comment[1], "content": comment[2], "username": comment[3],"user_id":comment[4]} for comment in comments]

@app.get("/users/me")
def get_me(current_user: dict = Depends(get_current_user)):
    user = fetch_query("SELECT id, name, username FROM users WHERE id=?", (current_user["id"],))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user[0][0], "name": user[0][1], "username": user[0][2]}

@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = fetch_query("SELECT id, name, username FROM users WHERE id=?", (user_id,))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user[0][0], "name": user[0][1], "username": user[0][2]}

@app.patch("/users/{user_id}")
def update_user(
    user_id: int, 
    user: UserUpdate,  # Use a separate model for updates
    current_user: dict = Depends(get_current_user)
): 
    if user_id != current_user["id"]: 
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # Dynamically build update query
    update_data = user.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    # Construct and execute dynamic update query
    update_columns = ", ".join([f"{k} = ?" for k in update_data.keys()])
    query = f"UPDATE users SET {update_columns} WHERE id = ?"
    
    params = list(update_data.values()) + [user_id]
    
    execute_query(query, tuple(params))
    
    return {"message": "User updated successfully"}

@app.put("/posts/{post_id}")
def update_post(request: Request, post_id: int, post: Post, current_user: dict = Depends(get_current_user)):
    # Get the location of the client
    location = get_location(get_client_ip(request))
    print("Location:", location)

    # Update the post content and location
    execute_query(
        "UPDATE posts SET content=?, location=? WHERE id=? AND user_id=?",
        (post.content, location, post_id, current_user["id"])
    )
    return {"message": "Post updated", "location": location}

@app.delete("/posts/{post_id}")
def delete_post(post_id: int, current_user: dict = Depends(get_current_user)):
    execute_query("DELETE FROM posts WHERE id=? AND user_id=?", (post_id, current_user["id"]))
    return {"message": "Post deleted"}

@app.put("/comments/{comment_id}")
def update_comment(comment_id: int, comment: Comment, current_user: dict = Depends(get_current_user)):
    execute_query("UPDATE comments SET content=? WHERE id=? AND user_id=?", (comment.content, comment_id, current_user["id"]))
    return {"message": "Comment updated"}

@app.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, current_user: dict = Depends(get_current_user)):
    execute_query("DELETE FROM comments WHERE id=? AND user_id=?", (comment_id, current_user["id"]))
    return {"message": "Comment deleted"}


# API to create a post with location
def get_public_ip():
    try:
        # Use a service to get your public IP
        response = requests.get("https://api64.ipify.org?format=json")
        data = response.json()
        return data['ip']
    except Exception as e:
        print("Error fetching public IP:", str(e))
        return None

# Function to get location from IP address
def get_location(ip: str):
    try:
        # If the IP is 127.0.0.1, get the public IP instead
        if ip == "127.0.0.1":
            ip = get_public_ip()  # Get the public IP for local testing

        # Use the ip-api service to get location data
        response = requests.get(f"http://ip-api.com/json/{ip}")
        print("Response from ip-api:", response.json())  # Log the full response
        data = response.json()

        if data["status"] == "fail":
            return "Unknown location"
        return f"{data['city']}, {data['country']}"
    except Exception as e:
        print("Error during location lookup:", str(e))  # Log the error
        return "Unknown location"

# API to get the client IP
def get_client_ip(request: Request):
    # If local (localhost), get the public IP
    if request.client.host == "127.0.0.1":
        return get_public_ip()  # Return public IP for local testing
    return request.client.host  # Return actual client IP if in production

# Function to translate text using googletrans
async def translate_text(text: str, target_language: str):
    try:
        # Use the Translator in async mode
        translator = Translator()
        
        # Translator.translate is async
        translated = await translator.translate(text, dest=target_language)
        
        # Return the translated text
        return translated.text
    except Exception as e:
        print("Error:", e)  # Log any errors
        return "Translation failed"

# FastAPI endpoint to handle translation request
@app.post("/translate")
async def translate(request: TranslateRequest):
    translated_text = await translate_text(request.text, request.target_language)
    return {"translated_text": translated_text}


@app.post("/posts", status_code=201)
def create_post(request: Request, post: Post, token: str = Depends(oauth2_scheme)):
    user_id = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])["sub"]
    location = get_location(get_client_ip(request))
    print("Location:",location)
    execute_query("INSERT INTO posts (user_id, content, location) VALUES (?, ?, ?)", (user_id, post.content, location))
    return {"message": "Post created", "location": location}


# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Run the server: uvicorn main:app --reload