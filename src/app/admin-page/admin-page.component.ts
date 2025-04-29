import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Instructor {
  _id: string;
  username: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
}

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
  enrolledUsers?: { id: string; name: string; email: string }[];
}

interface PendingCourse {
  _id: string;
  name: string;
  description: string;
  contents: string;
  pdfs: string[];
  youtubeLinks: string[];
  instructorId: string;
  thumbnail?: string;
  price: number;
  status: string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-page.component.html',
  styleUrls: ['./admin-page.component.css']
})
export class AdminPageComponent implements OnInit {
  currentView: string = 'createInstructor';
  instructorForm: FormGroup;
  editInstructorForm: FormGroup;
  instructors: Instructor[] = [];
  courses: Course[] = [];
  pendingCourses: PendingCourse[] = [];
  selectedInstructor: Instructor | null = null;
  instructorCreated: boolean = false;
  instructorUpdated: boolean = false;
  instructorError: string | null = null;
  instructorUpdateError: string | null = null;
  apiUrl: string = 'http://localhost:3000';

  constructor(private fb: FormBuilder, private http: HttpClient,private router: Router) {
    this.instructorForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email, Validators.pattern('^[a-z0-9._%+-]+@gmail.com$')]],
      mobile: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.editInstructorForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email, Validators.pattern('^[a-z0-9._%+-]+@gmail.com$')]],
      mobile: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    // Fetch Instructors
    this.http.get<Instructor[]>(`${this.apiUrl}/api/instructors`).subscribe({
      next: (instructors) => {
        this.instructors = instructors;
      },
      error: (err) => {
        console.error('Error fetching instructors:', err);
        this.instructors = [];
      }
    });
  
    // Fetch Courses
    this.http.get<{ message: string; courses: Course[] }>(`${this.apiUrl}/api/courses`).subscribe({
      next: (response) => {
        this.courses = response.courses.map(course => ({
          ...course,
          pdfs: Array.isArray(course.pdfs) ? course.pdfs : [],
          youtubeLinks: Array.isArray(course.youtubeLinks) ? course.youtubeLinks : [],
          enrolledUsers: Array.isArray(course.enrolledUsers) ? course.enrolledUsers : []
        }));
      },
      error: (err) => {
        console.error('Error fetching courses:', err);
        this.courses = [];
        this.instructorError = err.error?.message || 'Failed to load courses. Please try again.';
      }
    });
  
    // Fetch Pending Courses
    this.http.get<PendingCourse[]>(`${this.apiUrl}/api/pending-courses`).subscribe({
      next: (pendingCourses) => {
        console.log('Pending Courses Data:', pendingCourses); // Debug log
        this.pendingCourses = pendingCourses.map(pendingCourse => ({
          ...pendingCourse,
          pdfs: Array.isArray(pendingCourse.pdfs) ? pendingCourse.pdfs : [],
          youtubeLinks: Array.isArray(pendingCourse.youtubeLinks) ? pendingCourse.youtubeLinks : []
        }));
      },
      error: (err) => {
        console.error('Error fetching pending courses:', err);
        this.pendingCourses = [];
      }
    });
    
  }

  showCreateInstructor(): void {
    this.currentView = 'createInstructor';
    this.instructorCreated = false;
    this.instructorError = null;
    this.instructorForm.reset();
  }

  showViewCourses(): void {
    this.currentView = 'viewCourses';
    this.loadData();
  }

  showPendingCourses(): void {
    this.currentView = 'pendingCourses';
    this.loadData();
  }

  showManageInstructors(): void {
    this.currentView = 'manageInstructors';
    this.selectedInstructor = null;
    this.instructorUpdated = false;
    this.instructorUpdateError = null;
    this.loadData();
  }

  onInstructorSubmit(): void {
    if (this.instructorForm.valid) {
      const instructorData = this.instructorForm.value;
      this.http.post(`${this.apiUrl}/api/instructors`, {
        id: instructorData.username,
        ...instructorData
      }).subscribe({
        next: () => {
          this.instructorCreated = true;
          this.instructorError = null;
          this.instructorForm.reset();
          this.loadData();
        },
        error: (err) => {
          this.instructorError = err.error.message || 'Failed to create instructor';
          this.instructorCreated = false;
        }
      });
    }
  }

  editInstructor(instructor: Instructor): void {
    this.selectedInstructor = instructor;
    this.editInstructorForm.patchValue({
      username: instructor.username,
      name: instructor.name,
      email: instructor.email,
      mobile: instructor.mobile,
      password: instructor.password
    });
    this.instructorUpdated = false;
    this.instructorUpdateError = null;
  }

  onEditInstructorSubmit(): void {
    if (this.editInstructorForm.valid && this.selectedInstructor) {
      const updatedData = this.editInstructorForm.value;
      this.http.put(`${this.apiUrl}/api/instructors/${this.selectedInstructor._id}`, updatedData).subscribe({
        next: () => {
          this.instructorUpdated = true;
          this.instructorUpdateError = null;
          this.selectedInstructor = null;
          this.loadData();
        },
        error: (err) => {
          this.instructorUpdateError = err.error.message || 'Failed to update instructor';
          this.instructorUpdated = false;
        }
      });
    }
  }

  cancelEdit(): void {
    this.selectedInstructor = null;
    this.instructorUpdated = false;
    this.instructorUpdateError = null;
    this.editInstructorForm.reset();
  }

  deleteInstructor(instructorId: string): void {
    if (confirm('Are you sure you want to delete this instructor and their associated courses?')) {
      this.http.delete(`${this.apiUrl}/api/instructors/${instructorId}`).subscribe({
        next: () => {
          this.loadData();
        },
        error: (err) => {
          console.error('Error deleting instructor:', err);
        }
      });
    }
  }

  approveCourse(courseId: string): void {
    this.http.post(`${this.apiUrl}/api/pending-courses/approve/${courseId}`, {}).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => {
        console.error('Error approving course:', err);
      }
    });
  }

  rejectCourse(courseId: string): void {
    this.http.post(`${this.apiUrl}/api/pending-courses/reject/${courseId}`, {}).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => {
        console.error('Error rejecting course:', err);
      }
    });
  }

  getInstructorName(instructorId: string): string {
    const instructor = this.instructors.find(i => i._id === instructorId);
    return instructor ? instructor.name : 'Unknown';
  }
  logout(): void {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhoto');
    localStorage.removeItem('selectedCourses');
    localStorage.removeItem('adminId');
    console.log('Admin logged out');
    this.router.navigate(['/']);
  }
  
}