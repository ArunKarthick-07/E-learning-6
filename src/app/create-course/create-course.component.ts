import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface Course {
  name: string;
  description: string;
  contents: string;
  thumbnail?: string;
  price: number;
}

@Component({
  selector: 'app-create-course',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-course.component.html',
  styleUrls: ['./create-course.component.css']
})
export class CreateCourseComponent {
  course: Course = {
    name: '',
    description: '',
    contents: '',
    price: 0
  };
  
  youtubeLinks: string[] = [''];
  selectedFiles: File[] = [];
  selectedThumbnail: File | null = null;
  isLoading = false;
  thumbnailError: string = '';
  pdfError: string = '';
  youtubeLinkError: string = '';

  constructor(private router: Router, private http: HttpClient) {}

  addYoutubeLink(): void {
    this.youtubeLinks.push('');
  }

  removeYoutubeLink(index: number): void {
    this.youtubeLinks.splice(index, 1);
    this.validateYoutubeLinks(); // Validate after removal
  }

  onFileChange(event: any): void {
    const files: FileList = event.target.files;
    this.selectedFiles = [];
    for (let i = 0; i < files.length; i++) {
      this.selectedFiles.push(files[i]);
      console.log('Appending file to FormData:', files[i].name);
    }
    this.validatePdfs();
  }

  onThumbnailChange(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedThumbnail = file;
      console.log('Selected thumbnail:', this.selectedThumbnail.name);
    } else {
      this.selectedThumbnail = null;
    }
    this.validateThumbnail();
  }

  onYoutubeLinkChange(index: number): void {
    console.log(`YouTube link changed at index ${index}:`, this.youtubeLinks[index]);
    this.validateYoutubeLinks();
  }

  validateThumbnail(): void {
    this.thumbnailError = this.selectedThumbnail ? '' : 'Please upload a thumbnail image.';
  }

  validatePdfs(): void {
    this.pdfError = this.selectedFiles.length > 0 ? '' : 'Please upload at least one PDF.';
  }

  validateYoutubeLinks(): void {
    const validLinks = this.youtubeLinks
      .filter(link => link.trim() !== '')
      .filter(link => this.isValidYoutubeUrl(link));
    this.youtubeLinkError = validLinks.length > 0 ? '' : 'Please provide at least one valid YouTube link.';
  }

  isValidYoutubeUrl(url: string): boolean {
    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=[\w-]{11}|[\w-]{11})(\&[\w-=\&]*)?$/;
    return youtubeRegex.test(url);
  }

  async onSubmit(): Promise<void> {
    // Reset error messages
    this.thumbnailError = '';
    this.pdfError = '';
    this.youtubeLinkError = '';

    // Validate all fields
    this.validateThumbnail();
    this.validatePdfs();
    this.validateYoutubeLinks();

    // Check for basic course fields
    if (!this.course.name || !this.course.description || !this.course.contents || this.course.price < 0) {
      alert('Please fill in all required fields and ensure the price is non-negative');
      return;
    }

    // Check for thumbnail, PDFs, and YouTube links
    if (this.thumbnailError || this.pdfError || this.youtubeLinkError) {
      return; // Prevent submission if validation fails
    }

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn || !localStorage.getItem('instructorId')) {
      console.log('Instructor not logged in or no instructorId, redirecting to login');
      this.router.navigate(['/']);
      return;
    }

    this.isLoading = true;

    try {
      const formData = new FormData();
      formData.append('name', this.course.name);
      formData.append('description', this.course.description);
      formData.append('contents', this.course.contents);
      formData.append('youtubeLinks', JSON.stringify(this.youtubeLinks.filter(link => link.trim() !== '')));
      formData.append('instructorId', localStorage.getItem('instructorId') || '');
      formData.append('price', this.course.price.toString());

      this.selectedFiles.forEach(file => formData.append('pdfs', file));
      formData.append('thumbnail', this.selectedThumbnail!);

      const response: any = await this.http.post('http://localhost:3000/api/pending-courses', formData).toPromise();
      console.log('Pending course request sent:', response);
      alert('Course request submitted successfully! Awaiting admin approval.');
      this.router.navigate(['/instructor-page']);
    } catch (error: any) {
      console.error('Error submitting course request:', error);
      alert(error.error?.message || 'Failed to submit course request. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  goBack(): void {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn || !localStorage.getItem('instructorId')) {
      console.log('Instructor not logged in or no instructorId, redirecting to login');
      this.router.navigate(['/']);
      return;
    }

    this.router.navigate(['/instructor-page']).then(success => {
      console.log('Navigation to /instructor-page successful:', success);
    }).catch(err => {
      console.error('Navigation to /instructor-page failed:', err);
    });
  }

  trackByLink(index: number, link: string): number {
    return index;
  }
}