import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface Course {
  _id: string;
  name: string;
  description: string;
  contents: string;
  instructorId: string;
  price: number;
  thumbnail?: string;
  pdfs?: string[];
  youtubeLinks?: string[];
}

interface Notification {
  _id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-instructor-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instructor-page.component.html',
  styleUrls: ['./instructor-page.component.css']
})
export class InstructorPageComponent implements OnInit {
  username: string | null = null;
  courseCount: number = 0;
  courses: Course[] = [];
  selectedCourse: Course | null = null;
  notifications: Notification[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  showNotifications: boolean = false; // Hidden by default

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.username = localStorage.getItem('username');
    if (!this.username) {
      this.router.navigate(['/']);
      return;
    }
    this.fetchCourses();
    this.fetchNotifications();
  }

  async fetchCourses(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      const instructorId = localStorage.getItem('instructorId');
      if (!instructorId) {
        this.courseCount = 0;
        this.courses = [];
        this.error = 'Instructor ID not found in localStorage';
        this.isLoading = false;
        return;
      }
      const response: any = await this.http
        .get(`http://localhost:3000/api/courses/instructor/${instructorId}`)
        .toPromise();
      if (response && response.courses) {
        this.courses = response.courses.map((course: Course) => ({
          ...course,
          thumbnail: course.thumbnail ? `http://localhost:3000${course.thumbnail}` : 'assets/default-thumbnail.jpg'
        })) || [];
        this.courseCount = this.courses.length;
      } else {
        // Instead of setting an error, just set courses to empty array
        this.courses = [];
        this.courseCount = 0;
      }
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      this.courses = [];
      this.courseCount = 0;
      this.error = error.message || 'Failed to fetch courses. Please try again later.';
    } finally {
      this.isLoading = false;
    }
  }

  async fetchNotifications(): Promise<void> {
    try {
      const instructorId = localStorage.getItem('instructorId');
      if (!instructorId) {
        console.error('Instructor ID not found in localStorage');
        return;
      }
      const response: any = await this.http
        .get(`http://localhost:3000/api/notifications/instructor/${instructorId}`)
        .toPromise();
      if (response && response.notifications) {
        this.notifications = response.notifications;
      } else {
        this.notifications = [];
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      this.notifications = [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await this.http
        .put(`http://localhost:3000/api/notifications/${notificationId}/read`, {})
        .toPromise();
      this.notifications = this.notifications.map(notif =>
        notif._id === notificationId ? { ...notif, read: true } : notif
      );
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  selectCourse(course: Course): void {
    this.selectedCourse = { ...course };
    console.log('Selected course:', this.selectedCourse);
  }

  closeDetails(): void {
    this.selectedCourse = null;
  }

  viewMarklist(): void {
    if (this.selectedCourse) {
      this.viewStudentMarklist(this.selectedCourse._id);
    }
  }

  viewStudentMarklist(courseId: string): void {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      this.router.navigate(['/']);
      return;
    }
    this.router.navigate([`/view-student-marklist/${courseId}`]).then(success => {
      console.log('Navigation to /view-student-marklist successful:', success);
    }).catch(err => {
      console.error('Navigation to /view-student-marklist failed:', err);
    });
  }

  createCourse(): void {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      this.router.navigate(['/']);
      return;
    }
    this.router.navigate(['/create-course']).then(success => {
      console.log('Navigation to /create-course successful:', success);
    }).catch(err => {
      console.error('Navigation to /create-course failed:', err);
    });
  }

  viewCourses(): void {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      this.router.navigate(['/']);
      return;
    }
    this.router.navigate(['/view-courses']).then(success => {
      console.log('Navigation to /view-courses successful:', success);
    }).catch(err => {
      console.error('Navigation to /view-courses failed:', err);
    });
  }

  createAssessment(): void {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      this.router.navigate(['/']);
      return;
    }
    this.router.navigate(['/create-assessment']).then(success => {
      console.log('Navigation to /create-assessment successful:', success);
    }).catch(err => {
      console.error('Navigation to /create-assessment failed:', err);
    });
  }

  viewAssessments(): void {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      this.router.navigate(['/']);
      return;
    }
    this.router.navigate(['/view-assessments']).then(success => {
      console.log('Navigation to /view-assessments successful:', success);
    }).catch(err => {
      console.error('Navigation to /view-assessments failed:', err);
    });
  }

  logout(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('instructorId');
    this.router.navigate(['/']).then(success => {
      console.log('Logout navigation to / successful:', success);
    }).catch(err => {
      console.error('Logout navigation failed:', err);
    });
  }
}