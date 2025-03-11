import sqlite3
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
import threading

# Database setup
def init_db():
    conn = sqlite3.connect("data.db")
    cursor = conn.cursor()
    
    # Enable foreign key constraints
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL)''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS posts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        content TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS comments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        post_id INTEGER NOT NULL,
                        content TEXT NOT NULL,
                        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE)''')
    
    conn.commit()
    conn.close()


def execute_query(query, params=()):
    try:
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")  # Enable foreign keys safely
        cursor.execute(query, params)
        conn.commit()
    except sqlite3.Error as e:
        print("SQLite error:", e)
    finally:
        conn.close()

def fetch_query(query, params=()):
    try:
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")  # Enable foreign keys safely
        cursor.execute(query, params)
        results = cursor.fetchall()
        return results
    except sqlite3.Error as e:
        print("SQLite error:", e)
        return []
    finally:
        conn.close()
   
def run_server(httpd):
    print("Starting server on port 8080...")
    httpd.serve_forever()
# HTTP Server class
class SimpleAPIHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()  

    def do_GET(self):
        #get all users
        if self.path == "/users":
            print("get all users")
            users = fetch_query("SELECT * FROM users")
            self._set_headers()
            self.wfile.write(json.dumps(users).encode())
            conn = sqlite3.connect("data.db")
            cursor = conn.cursor()
            cursor.execute("PRAGMA foreign_keys;")  
            print(cursor.fetchone())
        #get all posts
        elif self.path=="/users/posts":
            print("get all posts")
            parts=self.path.strip("/").split("/")
            if len(parts)!=2 or parts[1]!="posts":
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            user_id=parts[1]
            posts = fetch_query("SELECT * FROM posts")
            self._set_headers()
            self.wfile.write(json.dumps(posts).encode())
        #get all comments
        elif self.path=="/users/posts/comments":
            print("get all comments")
            parts=self.path.strip("/").split("/")
            if len(parts)!=3:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            comments = fetch_query("SELECT * FROM comments")
            self._set_headers()
            self.wfile.write(json.dumps(comments).encode())
        #get user by id
        elif self.path.startswith("/users/") and "/posts" not in self.path and "/comments" not in self.path:
            print("get user by id")
            parts=self.path.strip("/").split("/")
            if len(parts)!=2:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            user_id=parts[1]
            user = fetch_query("SELECT * FROM users WHERE id=?", (user_id,))
            self._set_headers()
            self.wfile.write(json.dumps(user).encode())
        #get post by id
        elif self.path.startswith("/users/") and "/posts/" in self.path and "/comments" not in self.path:
            print("get post by id")
            parts=self.path.strip("/").split("/")
            print(parts)
            print(len(parts))
            if len(parts)!=3 :
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            post_id=parts[2]
            post = fetch_query("SELECT * FROM posts WHERE id=?", (post_id,))
            self._set_headers()
            self.wfile.write(json.dumps(post).encode())
        #get comment by id
        elif self.path.startswith("/users/posts/") and "/comments/" in self.path:
            print("get comment by id")
            parts=self.path.strip("/").split("/")
            if len(parts)!=4:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            comment_id=parts[3]
            comment = fetch_query("SELECT * FROM comments WHERE id=?", (comment_id,))
            self._set_headers()
            self.wfile.write(json.dumps(comment).encode())
        #get posts by user id
        elif self.path.startswith("/users/") and "/posts" in self.path and "/comments" not in self.path:
            print("get posts by user id")
            parts=self.path.strip("/").split("/")
            if len(parts)!=3:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            user_id=parts[1]
            posts = fetch_query("SELECT * FROM posts WHERE user_id=?", (user_id,))
            self._set_headers()
            self.wfile.write(json.dumps(posts).encode())
        #get comments by post id
        elif self.path.startswith("/users/posts/") and self.path.endswith("/comments"):
            print("get comments by post id")
            parts=self.path.strip("/").split("/")
            if len(parts)!=4:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            post_id=parts[2]
            comments = fetch_query("SELECT * FROM comments WHERE post_id=?", (post_id,))
            self._set_headers()
            self.wfile.write(json.dumps(comments).encode())
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode())


    def do_POST(self):
        content_length=int(self.headers.get('Content-Length',0))

        if content_length==0:
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": "Empty request"}).encode())
            return
        try:
            post_data = json.loads(self.rfile.read(content_length).decode())
        except json.JSONDecodeError:
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
            return
        
        if self.path == "/users":
            name=post_data.get("name")
            if not name:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Missing name"}).encode())
                return
            execute_query("INSERT INTO users (name) VALUES (?)", (name,))

            self._set_headers(201)
            self.wfile.write(json.dumps({"status": "User created"}).encode())

        elif self.path.startswith("/users/") and self.path.endswith("/posts") and self.path != "/users/posts":
            parts=self.path.strip("/").split("/")
            print(parts)
            print(len(parts))
            if len(parts)!=3 or parts[2]!="posts":
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            user_id=parts[1]
            content=post_data.get("content")
            if not content:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Missing content"}).encode())
                return
            execute_query("INSERT INTO posts (user_id, content) VALUES (?, ?)", (user_id, content))

            self._set_headers(201)
            self.wfile.write(json.dumps({"status": "Post created"}).encode())
        elif self.path.startswith("/users/posts/") and self.path.endswith("/comments") and self.path != "/users/posts/comments":
            parts=self.path.strip("/").split("/")
            print(parts)
            print(len(parts))
            if len(parts)!=4 or parts[3]!="comments":
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            post_id=parts[2]
            content=post_data.get("content")
            if not content:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Missing content"}).encode())
                return
            execute_query("INSERT INTO comments (post_id, content) VALUES (?, ?)", (post_id, content))
            self._set_headers(201)
            self.wfile.write(json.dumps({"status": "Comment created"}).encode())
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode())
    
    
    
    def do_PUT(self):
        content_length=int(self.headers.get('Content-Length',0))

        if content_length==0:
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": "Empty request"}).encode())
            return
        try:
            post_data = json.loads(self.rfile.read(content_length).decode())
        except json.JSONDecodeError:
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
            return
        if self.path.startswith("/users/") and "/posts" not in self.path and "/comments" not in self.path:
            print("users put")
            parts=self.path.strip("/").split("/")
            if len(parts)!=2:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            name=post_data.get("name")
            user_id=parts[1]
            if fetch_query("SELECT * FROM users WHERE id=?", (user_id,)) == []:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "User not found"}).encode())
                return
            if not name:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Missing name"}).encode())
                return
            execute_query("UPDATE users SET name=? WHERE id=?", (name,user_id))
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "User updated"}).encode())
                                             
        elif self.path.startswith("/users/posts/") and "/comments" not in self.path:
            parts=self.path.strip("/").split("/")
            print("posts put")
            print(parts)
            print(len(parts))
            if len(parts)!=3 :
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            post_id=parts[2]
            content=post_data.get("content")
            if fetch_query("SELECT * FROM posts WHERE id=?", (post_id,)) == []:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Post not found"}).encode())
                return
            if not content:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Missing content"}).encode())
                return
            execute_query("UPDATE posts SET content=? WHERE id=?", (content,post_id))

            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "Post updated"}).encode())
        elif self.path.startswith("/users/posts/comments/"):
            print("comments put")
            parts=self.path.strip("/").split("/")
            print(parts)
            print(len(parts))
            if len(parts)!=4:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            comment_id=parts[3]
            content=post_data.get("content")
            if fetch_query("SELECT * FROM comments WHERE id=?", (comment_id,)) == []:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Comment not found"}).encode())
                return
            if not content:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Missing content"}).encode())
                return
            execute_query("UPDATE comments SET content=? WHERE id=?", (content,comment_id))
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "Comment updated"}).encode())
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode())
    
    
    def do_DELETE(self):
        if self.path=="/users":
            print("delete all users")
            execute_query("DELETE FROM users")
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "All users deleted"}).encode())
        elif self.path=="/users/posts":
            execute_query("DELETE FROM posts")
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "All posts deleted"}).encode())
        elif self.path=="/users/posts/comments":
            execute_query("DELETE FROM comments")
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "All comments deleted"}).encode())
        elif self.path.startswith("/users/") and "/posts" not in self.path and "/comments" not in self.path:
            parts=self.path.strip("/").split("/")
            print(parts)
            print(len(parts))
            if len(parts)!=2:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            user_id=parts[1]
            if fetch_query("SELECT * FROM users WHERE id=?", (user_id,)) == []:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "User not found"}).encode())
                return
            execute_query("DELETE FROM users WHERE id=?", (user_id,))
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "User deleted"}).encode())
        elif self.path.startswith("/users/posts/") and "/comments" not in self.path:
            parts=self.path.strip("/").split("/")
            print(parts)
            print(len(parts))
            if len(parts)!=3:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            post_id=parts[2]
            if fetch_query("SELECT * FROM posts WHERE id=?", (post_id,)) == []:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Post not found"}).encode())
                return
            execute_query("DELETE FROM posts WHERE id=?", (post_id))
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "Post deleted"}).encode())
        elif self.path.startswith("/users/posts/comments/"):
            parts=self.path.strip("/").split("/")
            print(parts)
            print(len(parts))
            if len(parts)!=4:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            comment_id=parts[3]
            if fetch_query("SELECT * FROM comments WHERE id=?", (comment_id,)) == []:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Comment not found"}).encode())
                return
            execute_query("DELETE FROM comments WHERE id=?", (comment_id))
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "Comment deleted"}).encode())
        elif self.path.startswith("/users/") and self.path.endswith("/posts") and self.path != "/users/posts":
            parts=self.path.strip("/").split("/")
            print(parts)
            print(len(parts))
            if len(parts)!=3:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            user_id=parts[1]
            execute_query("DELETE FROM posts WHERE user_id=?", (user_id))
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "All users' posts deleted"}).encode())
        elif self.path.startswith("/users/posts/") and self.path.endswith("/comments") and self.path != "/users/posts/comments":
            parts=self.path.strip("/").split("/")
            print(parts)
            print(len(parts))
            if len(parts)!=4:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            post_id=parts[2]
            execute_query("DELETE FROM comments WHERE post_id=?", (post_id))
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "All posts' comments deleted"}).encode())
        
        elif self.path.startswith("/users/") and self.path.endswith("/posts"):
            parts=self.path.strip("/").split("/")
            print(parts)
            print(len(parts))
            if len(parts)!=2 or parts[1]!="posts":
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            user_id=parts[0]
            post_id=parts[1]
            execute_query("DELETE FROM posts WHERE user_id=? AND id=?", (user_id,post_id))
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "Post deleted"}).encode())
        elif self.path.startswith("/users/posts/") and self.path.endswith("/comments"):
            parts=self.path.strip("/").split("/")
            print(parts)
            print(len(parts))
            if len(parts)!=3 or parts[2]!="comments":
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Invalid URL format"}).encode())
                return
            post_id=parts[1]
            comment_id=parts[0]
            execute_query("DELETE FROM comments WHERE post_id=? AND id=?", (post_id,comment_id))
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "Comment deleted"}).encode())
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode())
# Start server
if __name__ == "__main__":
    server_address = ('', 8080)
    httpd = HTTPServer(server_address, SimpleAPIHandler)

    # Run server in a separate thread
    server_thread = threading.Thread(target=run_server, args=(httpd,))
    server_thread.start()

    try:
        while True:
            user_input = input("Press 'q' to stop the server: ").strip().lower()
            if user_input == 'q':
                print("Stopping server...")
                httpd.shutdown()  
                httpd.server_close()
                break
    except KeyboardInterrupt:
        print("Server interrupted and stopping...")
        httpd.shutdown()
        httpd.server_close()

    server_thread.join()
    print("Server stopped.")