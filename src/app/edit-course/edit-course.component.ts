import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgForm } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

interface Course {
  _id: string;
  name: string;
  description: string;
  contents: string;
  pdfs: string[];
  youtubeLinks: string[];
  instructorId: string;
  thumbnail?: string;
  price: number;
  createdAt: string;
}

@Component({
  selector: 'app-edit-course',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-course.component.html',
  styleUrls: ['./edit-course.component.css']
})
export class EditCourseComponent implements OnInit {
  course: Course = {
    _id: '',
    name: '',
    description: '',
    contents: '',
    pdfs: [],
    youtubeLinks: [''],
    instructorId: localStorage.getItem('instructorId') || '',
    thumbnail: '',
    price: 0,
    createdAt: ''
  };
  selectedFiles: File[] = [];
  selectedThumbnail: File | null = null;
  isLoading = false;
  backendBaseUrl = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private cdRef: ChangeDetectorRef
  ) {
    console.log('EditCourseComponent initialized');
  }

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('id');
    console.log('Editing course with ID:', courseId);
    if (courseId) {
      this.fetchCourse(courseId);
    } else {
      console.log('No courseId, navigating back');
      this.goBack();
    }
  }

  fetchCourse(courseId: string): void {
    this.isLoading = true;
    this.http.get<{ message: string; course: Course }>(`${this.backendBaseUrl}/api/courses/${courseId}`).subscribe({
      next: (response) => {
        this.course = { ...response.course, youtubeLinks: response.course.youtubeLinks || [''] };
        console.log('Loaded course for editing:', this.course);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching course:', err);
        this.isLoading = false;
        this.goBack();
      }
    });
  }

  addYoutubeLink(): void {
    this.course.youtubeLinks.push('');
  }

  removeYoutubeLink(index: number): void {
    if (this.course.youtubeLinks.length > 1) {
      this.course.youtubeLinks.splice(index, 1);
    } else {
      this.course.youtubeLinks = [''];
    }
    this.cdRef.detectChanges();
  }

  onFileChange(event: any): void {
    this.selectedFiles = Array.from(event.target.files);
    console.log('Selected PDFs:', this.selectedFiles.map(file => ({ name: file.name, type: file.type, size: file.size })));
  }

  onThumbnailChange(event: any): void {
    this.selectedThumbnail = event.target.files[0];
    console.log('Selected thumbnail:', this.selectedThumbnail ? { name: this.selectedThumbnail.name, type: this.selectedThumbnail.type, size: this.selectedThumbnail.size } : null);
  }

  uploadFiles(): void {
    if (this.selectedFiles.length > 0 || this.selectedThumbnail) {
      const formData = new FormData();
      this.selectedFiles.forEach(file => formData.append('pdfs', file));
      if (this.selectedThumbnail) formData.append('thumbnail', this.selectedThumbnail);
      console.log('Sending upload request for course ID:', this.course._id, 'with FormData:', Array.from(formData.entries()));

      this.isLoading = true;
      this.http.post(`${this.backendBaseUrl}/api/courses/${this.course._id}/upload`, formData).subscribe({
        next: (response: any) => {
          console.log('Files uploaded response:', response);
          this.course.pdfs = response.pdfLinks || this.course.pdfs;
          this.course.thumbnail = response.thumbnail || this.course.thumbnail;
          this.selectedFiles = [];
          this.selectedThumbnail = null;
          this.cdRef.detectChanges();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error uploading files:', err);
          this.isLoading = false;
        }
      });
    } else {
      console.log('No files selected for upload');
    }
  }

  getThumbnailUrl(thumbnailPath?: string): SafeUrl | string {
    if (!thumbnailPath) return '';
    return this.sanitizer.bypassSecurityTrustUrl(`${this.backendBaseUrl}${thumbnailPath}`);
  }

  removePdf(index: number): void {
    console.log('Removing PDF at index:', index, 'from:', this.course.pdfs);
    if (this.course.pdfs && this.course.pdfs.length > index && index >= 0) {
      this.course.pdfs.splice(index, 1);
      console.log('Updated PDFs after removal:', this.course.pdfs);
      this.cdRef.detectChanges();
    } else {
      console.log('Invalid index or empty PDFs array');
    }
  }

  onSubmit(form: NgForm): void {
    if (form.valid) {
      this.isLoading = true;
      const updatePayload = {
        ...this.course,
        pdfs: this.course.pdfs // Explicitly map pdfs to ensure it’s sent
      };
      console.log('Sending update payload:', updatePayload);
      this.http.put(`${this.backendBaseUrl}/api/courses/${this.course._id}`, updatePayload).subscribe({
        next: (response: any) => {
          console.log('Course updated response:', response);
          alert('Course updated successfully!');
          // Option 1: Navigate to ViewCoursesComponent (default)
          this.goBack();
          // Option 2: Stay on this page to continue editing (uncomment below if preferred)
          // this.fetchCourse(this.course._id);
          // this.isLoading = false;
        },
        error: (err) => {
          console.error('Error updating course:', err);
          alert('Failed to update course.');
          this.isLoading = false;
        }
      });
    }
  }

  goBack(): void {
    console.log('Navigating back to /view-courses from EditCourseComponent');
    this.router.navigate(['/view-courses']).catch(err => console.error('Navigation failed:', err));
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = 'assets/fallback-image.jpg';
    }
  }
}