import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-post-list',
  templateUrl: './post-list.component.html',
  styleUrls: ['./post-list.component.scss'],
  standalone: false
})
export class PostListComponent implements OnInit {
  posts: any[] = [];
  selectedLabelInfo: any = null;
  translatedCaptions: { [key: string]: string } = {}; // Store translated captions by post ID
  selectedLanguage: string = 'en'; // Default language


  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchPosts(); // Fetch posts when the component initializes
  }

  // Fetch posts from the backend
  fetchPosts() {
    this.http.get<any[]>('https://backend-dot-temacloud-456115.ew.r.appspot.com/posts/').subscribe(data => {
      this.posts = data;
      // Initialize the selected language for each post
      this.posts.forEach(post => {
        post.selectedLanguage = 'en';  // Default language (English)
      });
    });
  }

  // Open a new tab with Google search for the label
  searchLabelOnGoogle(label: string) {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(label)}`;
    window.open(searchUrl, '_blank'); // Open in a new tab
  }

  getSentimentLabel(score: number) {
    if (score > 0.2) {
      return "Positive";
    } else if (score < -0.2) {
      return "Negative";
    } else {
      return "Neutral";
    }
  }
  translateCaption(postId: string, caption: string) {
    this.http.get<any>(`https://backend-dot-temacloud-456115.ew.r.appspot.com/translate/${this.selectedLanguage}?caption=${encodeURIComponent(caption)}`).subscribe(response => {
      this.translatedCaptions[postId] = response.translated_caption;
    });
  }
  onPostCreated() {
    this.fetchPosts();
  }

  deletePost(postId: string) {
    if (confirm('Are you sure you want to delete this post?')) {
      this.http.delete(`https://backend-dot-temacloud-456115.ew.r.appspot.com/delete_post/${postId}`).subscribe(() => {
        // Remove the deleted post from the posts array
        this.posts = this.posts.filter(post => post.id !== postId);
        alert('Post deleted!');
      });
    }
  } 
  
}
