// src/app/components/post-detail/post-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Post } from '../../models/post';
import { PostComment } from '../../models/comment';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-post-detail',
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.css'],
  standalone:false
})
export class PostDetailComponent implements OnInit {
  postId: number | null = null;
  postForm: FormGroup = new FormGroup({
    title: new FormControl(''),
    content: new FormControl('')
  });
  post: Post | null = null;
  comments: PostComment[] = [];
  isLoadingPost = false;
  isLoadingComments = false;
  currentUser: User | null = null;
  newComment = '';
  remainingChars = 500;
  isSubmittingComment = false;
  availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'zh', name: 'Chinese' }
  ];
  
  constructor(
    private route: ActivatedRoute,
    private postService: PostService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
    
  ) {}
  
  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.postId = +idParam;
        this.loadPost();
        this.loadComments();
      }
    });
  }
  
  loadPost(): void {
    if (!this.postId) return;
    
    this.isLoadingPost = true;
    // This should be an API call to get a single post, but your backend doesn't have that endpoint
    // Instead, we'll get all posts and filter
    this.postService.getAllPosts().subscribe(
      posts => {
        this.post = posts.find(p => p.id === this.postId) || null;
        this.isLoadingPost = false;
        
        if (!this.post) {
          this.snackBar.open('Post not found', 'Close', {
            duration: 3000
          });
        }
      },
      error => {
        this.isLoadingPost = false;
        this.snackBar.open('Failed to load post', 'Close', {
          duration: 3000
        });
      }
    );
  }
  
  loadComments(): void {
    if (!this.postId) return;
    
    this.isLoadingComments = true;
    this.postService.getComments(this.postId).subscribe(
      comments => {
        this.comments = comments;
        this.isLoadingComments = false;
      },
      error => {
        this.isLoadingComments = false;
        this.snackBar.open('Failed to load comments', 'Close', {
          duration: 3000
        });
      }
    );
  }
  
  submitComment(): void {
    if (!this.postId || !this.newComment.trim()) return;
    
    this.isSubmittingComment = true;
    this.postService.createComment(this.postId, this.newComment).subscribe(
      () => {
        this.isSubmittingComment = false;
        this.newComment = '';
        this.loadComments(); // Reload comments
        this.snackBar.open('Comment added', 'Close', {
          duration: 3000
        });
      },
      error => {
        this.isSubmittingComment = false;
        this.snackBar.open('Failed to add comment', 'Close', {
          duration: 3000
        });
      }
    );
  }
  
  deleteComment(commentId: number): void {
    if (confirm('Are you sure you want to delete this comment?')) {
      this.postService.deleteComment(commentId).subscribe(
        () => {
          this.comments = this.comments.filter(comment => comment.id !== commentId);
          this.snackBar.open('Comment deleted', 'Close', {
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
  
  translatePost(targetLanguage: string): void {
    if (!this.post) return;
    
    this.post.isTranslating = true;
    
    this.postService.translateText(this.post.content, targetLanguage).subscribe(
      response => {
        if (this.post) {
          this.post.translatedContent = response.translated_text;
          this.post.isTranslating = false;
          this.post.isTranslated = true;
          this.post.translatedLanguage = this.availableLanguages.find(lang => lang.code === targetLanguage)?.name;
        }
      },
      error => {
        if (this.post) {
          this.post.isTranslating = false;
        }
        this.snackBar.open('Translation failed', 'Close', {
          duration: 3000
        });
      }
    );
  }
  
  resetTranslation(): void {
    if (this.post) {
      this.post.isTranslated = false;
      this.post.translatedContent = undefined;
      this.post.translatedLanguage = undefined;
    }
  }
  onSubmit(): void {
    if (this.postForm.valid) {
      this.isLoadingPost = true;
      const { content } = this.postForm.value;
      
      this.postService.createPost(content).subscribe(
        (response) => {
          this.isLoadingPost = false;
          this.snackBar.open('Post created successfully', 'Close', {
            duration: 3000
          });
          this.router.navigate(['/feed']);
        },
        error => {
          this.isLoadingPost = false;
          this.snackBar.open(error.error.detail || 'Failed to create post', 'Close', {
            duration: 3000
          });
        }
      );
    }
  }
}