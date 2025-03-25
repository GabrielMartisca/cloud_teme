import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user';
import { AuthResponse } from '../models/auth-response';
import { tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) { // Inject HttpClient
    const token = this.getToken();
    if (token) {
      this.getUserProfile().subscribe();
    }
  }

  register(name: string, username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { name, username, password });
  }

  login(username: string, password: string): Observable<AuthResponse> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, formData)
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.access_token);
          this.getUserProfile().subscribe();
        })
      );
  }

  getUserProfile(): Observable<User> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  
    return this.http.get<User>(`${this.apiUrl}/users/me`, { headers })
      .pipe(
        tap(user => {
          this.currentUserSubject.next(user);
        })
      );
  }
  

  logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  getToken(): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem('token');
    }
    return null;  // Return null if not in a browser environment
  }
  
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
