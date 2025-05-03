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
}

interface Student {
  _id: string;
  name: string;
  email: string;
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
  enrolledStudents: { [courseId: string]: Student[] } = {};
  studentsLoaded: { [courseId: string]: boolean } = {};
  instructorId: string | null = null;
  isLoading = false;
  errorMessage: string = '';
  backendBaseUrl = 'http://localhost:3000';
  selectedFile: File | null = null;
  selectedCourseId: string | null = null;
  focusedCourseId: string | null = null;

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
          youtubeLinks: Array.isArray(course.youtubeLinks) ? course.youtubeLinks : []
        }));
        for (const course of this.courses) {
          await this.fetchEnrolledStudents(course._id);
        }
      } else {
        this.courses = [];
        this.errorMessage = 'No courses found for this instructor.';
      }
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      this.errorMessage = 'Failed to load courses: ' + (error.statusText || error.message || 'Unknown error');
      this.courses = [];
    } finally {
      this.isLoading = false;
    }
  }

  async fetchEnrolledStudents(courseId: string): Promise<void> {
    try {
      console.log(`Fetching enrolled students for course ${courseId}`);
      const response: any = await this.http
        .get(`${this.backendBaseUrl}/api/courses/${courseId}/students`)
        .toPromise();
      console.log(`Enrolled students response for course ${courseId}:`, response);
      if (response && response.students && Array.isArray(response.students)) {
        this.enrolledStudents[courseId] = response.students.map((student: any) => ({
          _id: student._id,
          name: student.username || 'Unknown User', // Map 'username' to 'name'
          email: student.email || 'No email provided'
        }));
      } else {
        console.warn(`No students found for course ${courseId}`);
        this.enrolledStudents[courseId] = [];
      }
    } catch (error: any) {
      console.error(`Error fetching enrolled students for course ${courseId}:`, error);
      this.errorMessage = `Failed to load enrolled students for course ${courseId}: ` + 
        (error.statusText || error.message || 'Unknown error');
      this.enrolledStudents[courseId] = [];
    } finally {
      this.studentsLoaded[courseId] = true;
    }
  }

  getThumbnailUrl(thumbnailPath?: string): SafeUrl | string {
    if (!thumbnailPath) return '';
    const cacheBust = new Date().getTime();
    return this.sanitizer.bypassSecurityTrustUrl(`${this.backendBaseUrl}${thumbnailPath}?t=${cacheBust}`);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = 'assets/fallback-image.jpg';
    }
  }

  toggleFocus(courseId: string): void {
    if (this.focusedCourseId === courseId) {
      this.focusedCourseId = null;
    } else {
      this.focusedCourseId = courseId;
    }
  }

  resetFocus(): void {
    this.focusedCourseId = null;
  }

  onThumbnailChange(courseId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.selectedCourseId = courseId;
    }
  }

  async updateThumbnail(): Promise<void> {
    if (!this.selectedFile || !this.selectedCourseId || !this.instructorId) {
      this.errorMessage = 'Please select a file and ensure you are logged in.';
      return;
    }

    this.isLoading = true;
    const formData = new FormData();
    formData.append('thumbnail', this.selectedFile);

    console.log(`Sending thumbnail update for course: ${this.selectedCourseId}`);

    try {
      const response: any = await this.http
        .put(`${this.backendBaseUrl}/api/courses/${this.selectedCourseId}/thumbnail`, formData, {
          headers: { 'instructor-id': this.instructorId }
        })
        .toPromise();

      console.log('Thumbnail update response:', response);

      if (response && response.message === 'Thumbnail updated successfully') {
        console.log('Thumbnail updated, refreshing course data');
        await this.fetchCourses();
        alert('Thumbnail updated successfully!');
        this.selectedFile = null;
        this.selectedCourseId = null;
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (error: any) {
      console.error('Error updating thumbnail:', error);
      this.errorMessage = error.error?.message || 'Failed to update thumbnail';
    } finally {
      this.isLoading = false;
    }
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
          this.fetchCourses();
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

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  logout(): void {
    localStorage.removeItem('instructorId');
    localStorage.removeItem('isLoggedIn');
    this.router.navigate(['/']);
  }

  globalClickHandler(event: Event): void {
    console.log('Global click on:', event.target);
    if ((event.target as HTMLElement).textContent?.includes('Edit')) {
      console.log('Click on Edit link detected');
    }
  }
}