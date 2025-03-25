import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Post } from '../models/post';
import { PostComment } from '../models/comment';
import { TranslationResponse } from '../models/translation-response';
import {TranslationRequest} from '../models/translation-request';

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private apiUrl = 'http://localhost:8000';
  
  constructor(private http: HttpClient) { }

   // Fetch comments for a specific post
   getCommentsForPost(postId: number): Observable<PostComment[]> {
    return this.http.get<PostComment[]>(`${this.apiUrl}/posts/${postId}/comments`);
  }

  getAllPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/posts`);
  }

  getPostsByUser(userId: number): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/users/${userId}/posts`);
  }

  createPost(content: string): Observable<any> {
  const token = localStorage.getItem('token');  // Get the token from localStorage
  console.log(token);
  const headers = {
    'Authorization': `Bearer ${token}`  // Add the Authorization header
  };

  return this.http.post(`${this.apiUrl}/posts`, { content }, { headers });
}


  updatePost(postId: number, content: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/posts/${postId}`, { content });
  }

  deletePost(postId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/posts/${postId}`);
  }

  getComments(postId: number): Observable<PostComment[]> {
    return this.http.get<PostComment[]>(`${this.apiUrl}/posts/${postId}/comments`);
  }

  createComment(postId: number, content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/posts/${postId}/comments`, { content });
  }

  updateComment(commentId: number, content: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/comments/${commentId}`, { content });
  }

  deleteComment(commentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/comments/${commentId}`);
  }

  translateText(text: string, targetLanguage: string): Observable<TranslationResponse> {
    const translationRequest: TranslationRequest = {
      text: text,
      target_language: targetLanguage
    };
    return this.http.post<TranslationResponse>(`${this.apiUrl}/translate`, translationRequest);
  }
}