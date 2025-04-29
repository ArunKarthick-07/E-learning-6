import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
  marks: number;
}

interface Assessment {
  _id: string;
  title: string;
  questions: Question[];
  timeLimit: number;
  instructorId: string;
  courseId: string;
  createdAt: string;
}

interface Course {
  _id: string;
  name: string;
}

@Component({
  selector: 'app-view-assessments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-assessments.component.html',
  styleUrls: ['./view-assessments.component.css']
})
export class ViewAssessmentsComponent implements OnInit {
  assessments: Assessment[] = [];
  courses: Course[] = [];
  loading: boolean = true;
  error: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    const instructorId = localStorage.getItem('instructorId');
    if (!instructorId) {
      console.log('No instructorId found in localStorage, redirecting to login');
      this.router.navigate(['/']);
      return;
    }
    this.fetchCourses();
    this.fetchAssessments();
  }

  fetchCourses(): void {
    const instructorId = localStorage.getItem('instructorId');
    if (instructorId) {
      this.http
        .get<{ courses: Course[] }>(`http://localhost:3000/api/courses/instructor/${instructorId}`)
        .subscribe({
          next: (response) => {
            this.courses = response.courses;
          },
          error: (err) => {
            console.error('Error fetching courses:', err);
            this.courses = [];
          }
        });
    }
  }

  fetchAssessments(): void {
    this.loading = true;
    const instructorId = localStorage.getItem('instructorId');
    if (instructorId) {
      this.http
        .get<{ assessments: Assessment[] }>(`http://localhost:3000/api/assessments/instructor/${instructorId}`)
        .subscribe({
          next: (response) => {
            this.assessments = response.assessments;
            this.loading = false;
          },
          error: (err) => {
            console.error('Error fetching assessments:', err);
            this.error = err.error?.message || 'Failed to load assessments';
            this.loading = false;
          }
        });
    } else {
      this.loading = false;
      this.error = 'Instructor ID not found';
    }
  }

  getCourseName(courseId: string): string {
    const course = this.courses.find(c => c._id === courseId);
    return course ? course.name : 'Unknown Course';
  }

  goBack(): void {
    this.router.navigate(['/instructor-page']).then(success => {
      console.log('Navigation to /instructor-page successful:', success);
    }).catch(err => {
      console.error('Navigation to /instructor-page failed:', err);
    });
  }
}