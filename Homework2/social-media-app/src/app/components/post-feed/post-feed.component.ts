import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Post } from '../../models/post';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user';
import { PostComment } from '../../models/comment'; // Ensure the path is correct

@Component({
  selector: 'app-post-feed',
  templateUrl: './post-feed.component.html',
  styleUrls: ['./post-feed.component.css'],
  standalone: false
})
export class PostFeedComponent implements OnInit {
  posts: Post[] = [];
  isLoading = false;
  currentUser: User | null = null;
  comments: PostComment[] = []; // Initialize an empty comments array
  availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'zh', name: 'Chinese' }
  ];

  constructor(
    private postService: PostService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log('Current User:', this.currentUser);  // Check if currentUser is populated

    });

    this.loadPosts();
  }
  refreshComments(post: Post): void {
    this.postService.getCommentsForPost(post.id ?? 0).subscribe(
      (comments: PostComment[]) => {
        // Update the comments for the specific post
        post.comments = comments.map(comment => ({
          ...comment,
          isEditing: false,
          editedContent: comment.content
        }));
  
        // Add the comments to the global comments array
        this.comments = [...this.comments, ...post.comments];
  
        console.log('Global Comments Array:', this.comments); // Debugging
      },
      error => {
        this.snackBar.open('Failed to refresh comments', 'Close', {
          duration: 3000
        });
      }
    );
  }
  loadPosts(): void {
    this.postService.getAllPosts().subscribe(
      posts => {
        this.posts = posts.map(post => ({
          ...post,
          showComments: false, // Add this line to control comment visibility
          comments: [] // Initialize an empty comments array
        }));
        // Load comments for each post
        this.posts.forEach(post => this.loadComments(post));
        this.isLoading = false;
      },
      error => {
        this.isLoading = false;
        this.snackBar.open('Failed to load posts', 'Close', {
          duration: 3000
        });
      }
    );
  }

  loadComments(post: Post): void {
    this.postService.getCommentsForPost(post.id ?? 0).subscribe(
      (comments: PostComment[]) => {
        post.comments = comments.map(comment => ({
          ...comment,
          isEditing: false,
          editedContent: comment.content
        }));
        console.log('Comments for Post:', post.id, post.comments); // Debugging
      },
      error => {
        this.snackBar.open('Failed to load comments', 'Close', {
          duration: 3000
        });
      }
    );
  }

  editComment(comment: PostComment): void {
    comment.isEditing = true;
  }

  saveComment(post: Post, comment: PostComment): void {
    this.postService.updateComment(comment.id ?? 0, comment.editedContent).subscribe(
      () => {
        comment.content = comment.editedContent;
        comment.isEditing = false;
        this.snackBar.open('Comment updated successfully', 'Close', {
          duration: 3000
        });
      },
      error => {
        this.snackBar.open('Failed to update comment', 'Close', {
          duration: 3000
        });
      }
    );
  }

  cancelEdit(comment: PostComment): void {
    comment.isEditing = false;
    comment.editedContent = comment.content;
  }

  deleteComment(post: Post, commentId: number): void {
    if (confirm('Are you sure you want to delete this comment?')) {
      this.postService.deleteComment(commentId).subscribe(
        () => {
          post.comments = (post.comments ?? []).filter(comment => comment.id !== commentId);
          this.snackBar.open('Comment deleted successfully', 'Close', {
            duration: 3000
          });
        },
        error => {
          this.snackBar.open('Failed to delete comment', 'Close', {
            duration: 3000
          });
        }
      );
    }
  }

  translatePost(post: Post, targetLanguage: string): void {
    const postToTranslate = { ...post };
    postToTranslate.isTranslating = true;

    this.postService.translateText(post.content, targetLanguage).subscribe(
      response => {
        postToTranslate.translatedContent = response.translated_text;
        postToTranslate.isTranslating = false;
        postToTranslate.isTranslated = true;
        postToTranslate.translatedLanguage = this.availableLanguages.find(lang => lang.code === targetLanguage)?.name;

        // Update the post in the array
        const index = this.posts.findIndex(p => p.id === post.id);
        if (index !== -1) {
          this.posts[index] = postToTranslate;
        }
      },
      error => {
        postToTranslate.isTranslating = false;
        this.snackBar.open('Translation failed', 'Close', {
          duration: 3000
        });
      }
    );
  }

  deletePost(postId: number): void {
    if (confirm('Are you sure you want to delete this post?')) {
      this.postService.deletePost(postId).subscribe(
        () => {
          this.posts = this.posts.filter(post => post.id !== postId);
          this.snackBar.open('Post deleted successfully', 'Close', {
            duration: 3000
          });
        },
        error => {
          this.snackBar.open('Failed to delete post', 'Close', {
            duration: 3000
          });
        }
      );
    }
  }

  resetTranslation(post: Post): void {
    const index = this.posts.findIndex(p => p.id === post.id);
    if (index !== -1) {
      this.posts[index].isTranslated = false;
      this.posts[index].translatedContent = undefined;
      this.posts[index].translatedLanguage = undefined;
    }
  }

  toggleComments(post: Post): void {
    post.showComments = !post.showComments;
  }

  editPost(post: Post): void {
    console.log('Before edit, isEditing:', post.isEditing);  // Check current value
    post.isEditing = true;
    post.editedContent = post.content;  // Store the original content for cancel functionality
    console.log('After edit, isEditing:', post.isEditing);  // Verify if the value is updated
  }
  
  
  
  savePost(post: Post): void {
    if (post.editedContent && post.editedContent !== post.content) {
      // Make an API call to update the post
      this.postService.updatePost(post.id ?? 0, post.editedContent).subscribe(
        () => {
          post.content = post.editedContent ?? post.content;
          post.isEditing = false;
          this.snackBar.open('Post updated successfully', 'Close', {
            duration: 3000
          });
        },
        error => {
          this.snackBar.open('Failed to update post', 'Close', {
            duration: 3000
          });
        }
      );
    } else {
      post.isEditing = false; // If no change, just close the editing mode
    }
  }
  
  cancelEditPost(post: Post): void {
    post.isEditing = false;
    post.editedContent = post.content;  // Revert to the original content
  }
}
