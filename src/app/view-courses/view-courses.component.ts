import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  showDetails?: boolean;
}

@Component({
  selector: 'app-view-courses',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './view-courses.component.html',
  styleUrls: ['./view-courses.component.css']
})
export class ViewCoursesComponent implements OnInit, OnDestroy {
  courses: Course[] = [];
  instructorId: string | null = null;
  isLoading = false;
  errorMessage: string = '';
  backendBaseUrl = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        console.log('Navigation completed to:', event.url);
      }
    });
  }

  ngOnInit(): void {
    console.log('ViewCoursesComponent initialized');
    this.instructorId = localStorage.getItem('instructorId');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    console.log('Initial state - instructorId:', this.instructorId, 'isLoggedIn:', isLoggedIn);
    if (!this.instructorId) {
      console.log('No instructorId found, redirecting to login');
      this.router.navigate(['/']).catch(err => console.error('Redirect to login failed:', err));
      return;
    }
    this.fetchCourses();
    document.addEventListener('click', this.globalClickHandler.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.globalClickHandler.bind(this));
  }

  async fetchCourses(): Promise<void> {
    this.isLoading = true;
    try {
      const response: any = await this.http
        .get(`${this.backendBaseUrl}/api/courses/instructor/${this.instructorId}`)
        .toPromise();
      if (response && response.courses) {
        this.courses = response.courses.map((course: Course) => ({
          ...course,
          pdfs: Array.isArray(course.pdfs) ? course.pdfs : [],
          youtubeLinks: Array.isArray(course.youtubeLinks) ? course.youtubeLinks : [],
          showDetails: false
        }));
      } else {
        this.courses = [];
      }
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      this.errorMessage = 'Failed to load courses';
      this.courses = [];
    } finally {
      this.isLoading = false;
    }
  }

  getThumbnailUrl(thumbnailPath?: string): SafeUrl | string {
    if (!thumbnailPath) return '';
    return this.sanitizer.bypassSecurityTrustUrl(`${this.backendBaseUrl}${thumbnailPath}`);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = 'assets/fallback-image.jpg';
    }
  }

  toggleDetails(course: Course): void {
    course.showDetails = !course.showDetails;
  }

  onEditClick(course: Course, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    console.log('Attempting to navigate to edit-course/', course._id, 'with instructorId:', this.instructorId);
    this.router.navigate(['edit-course', course._id]).catch(err => {
      console.error('Navigation to edit-course failed:', err);
      this.goBack();
    });
  }

  deleteCourse(courseId: string): void {
    if (!this.instructorId) {
      this.errorMessage = 'Instructor not logged in';
      return;
    }

    if (confirm('Are you sure you want to delete this course?')) {
      this.http.delete(`${this.backendBaseUrl}/api/courses/${courseId}`, {
        headers: { 'instructor-id': this.instructorId }
      }).subscribe({
        next: () => {
          console.log(`Course ${courseId} deleted`);
          this.fetchCourses(); // Refresh the course list
          alert('Course deleted successfully!');
        },
        error: (err) => {
          console.error('Error deleting course:', err);
          this.errorMessage = err.error?.message || 'Failed to delete course';
        }
      });
    }
  }

  goBack(): void {
    console.log('goBack() called, checking login status');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    console.log('Current isLoggedIn:', isLoggedIn);
    if (!isLoggedIn) {
      console.log('User not logged in, redirecting to login');
      this.router.navigate(['/']).catch(err => console.error('Redirect to login failed:', err));
    } else {
      console.log('Navigating to /instructor-page');
      this.router.navigate(['/instructor-page']).catch(err => console.error('Navigation to instructor-page failed:', err));
    }
  }

  globalClickHandler(event: Event): void {
    console.log('Global click on:', event.target);
    if ((event.target as HTMLElement).textContent?.includes('Edit')) {
      console.log('Click on Edit link detected');
    }
  }
}