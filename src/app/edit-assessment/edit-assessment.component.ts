import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Assessment {
  _id: string;
  title: string;
  courseId: string;
  questions: { text: string; options: string[]; correctAnswer: number; marks: number }[];
  timeLimit: number;
  createdAt: string;
}

@Component({
  selector: 'app-edit-assessment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-assessment.component.html',
  styleUrls: ['./edit-assessment.component.css']
})
export class EditAssessmentComponent implements OnInit {
  assessment: Assessment | null = null;
  loading: boolean = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const assessmentId = this.route.snapshot.paramMap.get('id');
    if (assessmentId) {
      this.fetchAssessment(assessmentId);
    } else {
      this.error = 'Invalid assessment ID';
    }
  }

  // Add trackByIndex method to fix NG9 error
  trackByIndex(index: number): number {
    return index;
  }

  async fetchAssessment(assessmentId: string): Promise<void> {
    this.loading = true;
    this.error = null;
    const instructorId = localStorage.getItem('instructorId');
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
          questions: (response.assessment.questions || []).map((q: any) => ({
            text: q.text || '',
            options: q.options || ['', '', '', ''],
            correctAnswer: q.correctAnswer || 1,
            marks: q.marks || 1
          })),
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

  onFocus(questionIndex: number, optionIndex: number): void {
    console.log(`Focus on Option [${questionIndex}, ${optionIndex}]`);
  }

  onBlur(questionIndex: number, optionIndex: number): void {
    console.log(`Blur from Option [${questionIndex}, ${optionIndex}]`);
  }

  async updateAssessment(): Promise<void> {
    if (!this.assessment) return;
    this.loading = true;
    this.error = null;

    for (const question of this.assessment.questions) {
      if (!question.options || question.options.length !== 4) {
        this.error = 'Each question must have exactly 4 options';
        this.loading = false;
        return;
      }
      for (const option of question.options) {
        if (!option.trim()) {
          this.error = 'Each option must be a non-empty string';
          this.loading = false;
          return;
        }
      }
      if (question.correctAnswer < 1 || question.correctAnswer > 4) {
        this.error = 'Correct answer must be between 1 and 4';
        this.loading = false;
        return;
      }
      if (question.marks < 1) {
        this.error = 'Marks must be at least 1';
        this.loading = false;
        return;
      }
    }

    const instructorId = localStorage.getItem('instructorId');
    const headers = new HttpHeaders({
      'instructor-id': instructorId || ''
    });

    try {
      const response: any = await this.http.put(
        `http://localhost:3000/api/assessments/${this.assessment._id}`,
        this.assessment,
        { headers }
      ).toPromise();
      if (response && response.message === 'Assessment updated successfully') {
        this.router.navigate([`/assessment-detail/${this.assessment!._id}`]);
      }
    } catch (error: any) {
      console.error('Error updating assessment:', error);
      this.error = error.status === 403 ? 'Unauthorized: You can only modify your own assessments' : 
                   'Failed to update assessment';
    } finally {
      this.loading = false;
    }
  }

  goBack(): void {
    if (this.assessment) {
      this.router.navigate([`/assessment-detail/${this.assessment._id}`]);
    } else {
      this.router.navigate(['/view-assessments']);
    }
  }

  addQuestion(): void {
    if (!this.assessment) return;
    this.assessment.questions.push({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 1,
      marks: 1
    });
  }

  removeQuestion(index: number): void {
    if (!this.assessment || this.assessment.questions.length <= 1) return;
    this.assessment.questions.splice(index, 1);
  }
}