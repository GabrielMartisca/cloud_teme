import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';
import { User } from '../../models/user';
import { Post } from '../../models/post';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
  standalone: false
})
export class UserProfileComponent implements OnInit {
  userId: number | null = null;
  user: User | null = null;
  userPosts: Post[] = [];
  isLoading = true;
  isCurrentUser = false;
  editMode = false;
  editedUser: Partial<User> = {};

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private authService: AuthService,
    private postService: PostService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const userIdParam = params.get('id');
      this.userId = userIdParam ? parseInt(userIdParam, 10) : null;

      if (this.userId) {
        this.loadUserProfile();
        this.loadUserPosts();
        this.checkIfCurrentUser();
      }
    });
  }

  loadUserProfile(): void {
    if (this.userId) {
      this.isLoading = true;
      this.userService.getUserProfile(this.userId).subscribe(
        user => {
          this.user = user;
          this.isLoading = false;
        },
        error => {
          this.snackBar.open('Failed to load user profile', 'Close', {
            duration: 3000
          });
          this.isLoading = false;
        }
      );
    }
  }

  loadUserPosts(): void {
    if (this.userId) {
      this.postService.getPostsByUser(this.userId).subscribe(
        posts => {
          this.userPosts = posts;
        },
        error => {
          this.snackBar.open('Failed to load user posts', 'Close', {
            duration: 3000
          });
        }
      );
    }
  }

  checkIfCurrentUser(): void {
    this.authService.currentUser$.subscribe(currentUser => {
      this.isCurrentUser = currentUser?.id === this.userId;
      if (this.isCurrentUser) {
        this.editedUser = { ...this.user };
      }
    });
  }

  enterEditMode(): void {
    this.editMode = true;
    this.editedUser = { ...this.user };
  }

  cancelEdit(): void {
    this.editMode = false;
    this.editedUser = {};
  }

  saveProfile(): void {
    if (this.userId) {
      // Remove undefined or null values from the payload
      const cleanedUser = Object.fromEntries(
        Object.entries(this.editedUser).filter(([_, v]) => v != null)
      );
  
      this.userService.updateUserProfile(this.userId, cleanedUser)
        .pipe(
          // Add some RxJS operators for better error handling
          catchError((error: HttpErrorResponse) => {
            let errorMessage = 'Failed to update profile';
            
            // More detailed error handling
            if (error.status === 403) {
              errorMessage = 'You are not authorized to update this profile';
            } else if (error.status === 400) {
              errorMessage = 'Invalid profile data';
            } else if (error.status === 404) {
              errorMessage = 'User not found';
            }
  
            this.snackBar.open(errorMessage, 'Close', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
  
            // Re-throw the error for further handling if needed
            return throwError(error);
          })
        )
        .subscribe({
          next: (updatedUser) => {
            this.user = updatedUser;
            this.editMode = false;
            this.snackBar.open('Profile updated successfully', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          },
          error: () => {
            // Error is already handled by catchError, 
            // this block ensures the error doesn't crash the app
          }
        });
    }
    this.loadUserProfile();
    window.location.reload();
  }

  deletePost(postId: number): void {
    if (confirm('Are you sure you want to delete this post?')) {
      this.postService.deletePost(postId).subscribe(
        () => {
          this.userPosts = this.userPosts.filter(post => post.id !== postId);
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
}