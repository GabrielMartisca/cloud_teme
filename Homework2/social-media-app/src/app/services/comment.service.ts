// src/app/services/comment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service'; // Import your AuthService

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrl = 'http://localhost:8000/posts';

  constructor(private http: HttpClient, private authService: AuthService) {}

  createComment(postId: number, content: string): Observable<any> {
    const token = this.authService.getToken(); // Retrieve JWT token
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.post(`${this.apiUrl}/${postId}/comments`, { content }, { headers });
  }
}
