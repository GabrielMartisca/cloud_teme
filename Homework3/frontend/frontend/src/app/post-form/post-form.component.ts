import { Component, EventEmitter, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-post-form',
  templateUrl: './post-form.component.html',
  styleUrls: ['./post-form.component.scss'],
  standalone: false
})
export class PostFormComponent {
  caption = '';
  language = 'en';
  file: File | null = null;

  @Output() postCreated = new EventEmitter<void>();  // EventEmitter to notify post creation


  constructor(private http: HttpClient) {}

  onFileChange(event: any) {
    this.file = event.target.files[0];
  }

  submitPost() {
    if (!this.file) return;

    const formData = new FormData();
    formData.append('file', this.file);

    // Step 1: Upload the image
    this.http.post<any>('https://backend-dot-temacloud-456115.ew.r.appspot.com/upload/', formData).subscribe(uploadRes => {
      const imageUrl = uploadRes.image_url;
      const labels = uploadRes.labels; // Get labels from the response

      // Step 2: Create the post
      const postData = {
        image_url: imageUrl,
        caption: this.caption,
        language: this.language,
        labels: labels // Add labels here
      };

      this.http.post('https://backend-dot-temacloud-456115.ew.r.appspot.com/create_post/', postData).subscribe(() => {
        this.caption = '';
        this.language = 'en';
        this.file = null;
        this.postCreated.emit();
        window.location.reload();
      });
        // Emit event to notify parent to refresh posts
    });
  }
}
