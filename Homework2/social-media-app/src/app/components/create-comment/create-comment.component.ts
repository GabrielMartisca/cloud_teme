import { Component, Input,EventEmitter, Output } from '@angular/core';
import { CommentService } from '../../services/comment.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';


@Component({
  selector: 'app-create-comment',
  templateUrl: './create-comment.component.html',
  styleUrls: ['./create-comment.component.css'],
  standalone: false
})
export class CreateCommentComponent {
  @Input() postId!: number; // Receive post ID from parent component
  @Output() commentAdded = new EventEmitter<void>(); // Emit event when a comment is added
  commentForm: FormGroup;
  isLoading = false;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private commentService: CommentService,
    private snackBar: MatSnackBar
  ) {
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(300)]]
    });
  }

  onSubmit(): void {
    if (this.commentForm.valid) {
      this.isLoading = true;
      const { content } = this.commentForm.value;
  
      this.commentService.createComment(this.postId, content).subscribe(
        () => {
          this.isLoading = false;
          this.snackBar.open('Comment added successfully', 'Close', { duration: 3000 });
         
          this.commentAdded.emit();

          // ✅ Manually clear validation before resetting
          this.commentForm.get('content')?.setErrors(null);
          this.commentForm.reset();
        },
        error => {
          this.isLoading = false;
          this.snackBar.open(error.error.detail || 'Failed to add comment', 'Close', { duration: 3000 });
        }
      );
    }
  }
  
  get remainingChars(): number {
    const content = this.commentForm.get('content')?.value || '';
    return 300 - content.length;
  }
}
