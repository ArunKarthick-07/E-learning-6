import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Student {
  _id: string;
  username: string;
  email: string;
}

interface Assessment {
  _id: string;
  title: string;
}

interface Submission {
  studentId: { _id: string; username: string };
  score: number;
  submittedAt: string;
}

@Component({
  selector: 'app-view-student-marklist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-student-marklist.component.html',
  styleUrls: ['./view-student-marklist.component.css']
})
export class ViewStudentMarklistComponent implements OnInit {
  courseId: string | null = null;
  students: Student[] = [];
  assessments: Assessment[] = [];
  submissions: { [assessmentId: string]: Submission[] } = {};
  errorMessage: string = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId');
    if (this.courseId) {
      this.loadStudents();
      this.loadAssessments();
    } else {
      this.errorMessage = 'Course ID not provided.';
    }
  }

  loadStudents(): void {
    this.http.get<{ students: Student[] }>(`http://localhost:3000/api/courses/${this.courseId}/students`).subscribe({
      next: (data) => {
        this.students = data.students;
        console.log('Students loaded:', this.students);
      },
      error: (err) => {
        console.error('Error fetching students:', err);
        this.errorMessage = 'Failed to load students.';
      }
    });
  }

  loadAssessments(): void {
    this.http.get<{ assessments: Assessment[] }>(`http://localhost:3000/api/courses/${this.courseId}/assessments`).subscribe({
      next: (data) => {
        this.assessments = data.assessments;
        console.log('Assessments loaded:', this.assessments);
        this.loadSubmissions();
      },
      error: (err) => {
        console.error('Error fetching assessments:', err);
        this.errorMessage = 'Failed to load assessments.';
      }
    });
  }

  loadSubmissions(): void {
    this.assessments.forEach(assessment => {
      this.http.get<{ submissions: Submission[] }>(`http://localhost:3000/api/assessments/${assessment._id}/submissions`).subscribe({
        next: (data) => {
          this.submissions[assessment._id] = data.submissions;
          console.log(`Submissions for assessment ${assessment._id}:`, this.submissions[assessment._id]);
        },
        error: (err) => {
          console.error(`Error fetching submissions for assessment ${assessment._id}:`, err);
          this.submissions[assessment._id] = [];
        }
      });
    });
  }

  getStudentScore(studentId: string, assessmentId: string): number | null {
    const assessmentSubmissions = this.submissions[assessmentId] || [];
    const submission = assessmentSubmissions.find(sub => sub.studentId._id === studentId);
    return submission ? submission.score : null;
  }

  goBack(): void {
    const instructorId = localStorage.getItem('instructorId');
    if (instructorId) {
      this.router.navigate(['/instructor-page'], { queryParams: { id: instructorId } });
    } else {
      this.router.navigate(['/']);
    }
  }
}