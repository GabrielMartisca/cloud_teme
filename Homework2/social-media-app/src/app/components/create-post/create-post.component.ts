// src/app/components/create-post/create-post.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-create-post',
  templateUrl: './create-post.component.html',
  styleUrls: ['./create-post.component.css'],
  standalone:false
})
export class CreatePostComponent {
  postForm: FormGroup;
  isLoading = false;
  
  constructor(
    private fb: FormBuilder,
    private postService: PostService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.postForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }
  
  onSubmit(): void {
    if (this.postForm.valid) {
      this.isLoading = true;
      const { content } = this.postForm.value;
      
      this.postService.createPost(content).subscribe(
        (response) => {
          this.isLoading = false;
          this.snackBar.open('Post created successfully', 'Close', {
            duration: 3000
          });
          this.router.navigate(['/feed']);
        },
        error => {
          this.isLoading = false;
          this.snackBar.open(error.error.detail || 'Failed to create post', 'Close', {
            duration: 3000
          });
        }
      );
    }
  }
  
  get remainingChars(): number {
    const content = this.postForm.get('content')?.value || '';
    return 500 - content.length;
  }
}