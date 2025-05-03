import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface Assessment {
  _id: string;
  title: string;
  courseId: string;
  questions: { text: string; options?: string[]; correctAnswer: number; marks?: number }[];
  timeLimit: number;
  createdAt: string;
}

interface Course {
  _id: string;
  name: string;
}

@Component({
  selector: 'app-assessment-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assessment-detail.component.html',
  styleUrls: ['./assessment-detail.component.css']
})
export class AssessmentDetailComponent implements OnInit {
  assessment: Assessment | null = null;
  courses: Course[] = [];
  loading: boolean = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const assessmentId = this.route.snapshot.paramMap.get('id');
    console.log('Assessment ID from route:', assessmentId);
    if (!assessmentId || !this.isValidObjectId(assessmentId)) {
      this.error = 'Invalid assessment ID';
      return;
    }
    this.fetchAssessment(assessmentId);
    this.fetchCourses();
  }

  // Helper to validate MongoDB ObjectId format
  private isValidObjectId(id: string): boolean {
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    return objectIdPattern.test(id);
  }

  async fetchAssessment(assessmentId: string): Promise<void> {
    this.loading = true;
    this.error = null;

    // Retrieve instructorId from localStorage (assuming it's stored after login)
    const instructorId = localStorage.getItem('instructorId'); // Adjust based on your auth implementation
    if (!instructorId) {
      this.error = 'Instructor ID is required';
      this.loading = false;
      return;
    }

    const headers = new HttpHeaders({
      'instructor-id': instructorId
    });

    try {
      console.log(`Fetching assessment from: http://localhost:3000/api/assessments/${assessmentId}`);
      const response: any = await this.http.get(`http://localhost:3000/api/assessments/${assessmentId}`, { headers }).toPromise();
      console.log('Response:', response);
      if (response && response.assessment) {
        this.assessment = {
          _id: response.assessment._id,
          title: response.assessment.title,
          courseId: response.assessment.courseId,
          questions: response.assessment.questions || [],
          timeLimit: response.assessment.timeLimit || 0,
          createdAt: response.assessment.createdAt
        };
      } else {
        this.error = 'Assessment not found';
      }
    } catch (error: any) {
      console.error('Error fetching assessment:', error);
      this.error = error.status === 404 ? 'Assessment not found' : 
                   error.status === 403 ? 'Unauthorized access' : 
                   'Failed to load assessment';
    } finally {
      this.loading = false;
    }
  }

  async fetchCourses(): Promise<void> {
    try {
      const response: any = await this.http.get('http://localhost:3000/api/courses').toPromise();
      if (response && response.courses) {
        this.courses = response.courses;
      } else {
        this.courses = [];
      }
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      this.courses = [];
    }
  }

  getCourseName(courseId: string): string {
    const course = this.courses.find(c => c._id === courseId);
    return course ? course.name : 'Unknown Course';
  }

  editAssessment(): void {
    if (this.assessment) {
      this.router.navigate([`/edit-assessment/${this.assessment._id}`]);
    }
  }

  async deleteAssessment(): Promise<void> {
    if (this.assessment && confirm('Are you sure you want to delete this assessment?')) {
      try {
        const instructorId = localStorage.getItem('instructorId'); // Adjust based on your auth
        const headers = new HttpHeaders({
          'instructor-id': instructorId || ''
        });
        await this.http.delete(`http://localhost:3000/api/assessments/${this.assessment._id}`, { headers }).toPromise();
        this.router.navigate(['/view-assessments']);
      } catch (error: any) {
        console.error('Error deleting assessment:', error);
        this.error = 'Failed to delete assessment';
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/view-assessments']);
  }
}