// filepath: src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { User } from '../models/user'; // Adjust the path to your User model
import { Post } from '../models/post';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8000'; // Replace with your actual API URL

  constructor(private http: HttpClient) {}

  getUserProfile(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${userId}`);
  }

  getUserPosts(userId: number): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/users/${userId}/posts`);
  }
  updateUserProfile(userId: number, user: Partial<User>): Observable<User> {
    // Add type safety and validation
    if (!userId) {
      throw new Error('User ID is required');
    }
  
    return this.http.patch<User>(`${this.apiUrl}/users/${userId}`, user).pipe(
      // Optional: Add some additional RxJS operators for transformation or validation
      map(response => {
        // Optionally validate or transform the response
        if (!response) {
          throw new Error('No user data returned');
        }
        return response;
      })
    );
  }
}