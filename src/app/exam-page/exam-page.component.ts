import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Assessment {
  _id: string;
  title: string;
  courseId: string;
  timeLimit: number;
  questions: {
    text: string;
    options: string[];
    correctAnswer: number;
    marks: number;
  }[];
}

@Component({
  selector: 'app-exam-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-page.component.html',
  styleUrls: ['./exam-page.component.css']
})
export class ExamPageComponent implements OnInit, OnDestroy {
  assessment: Assessment | null = null;
  answers: (number | undefined)[] = [];
  timeRemaining: number = 0;
  timer: any;
  submitted: boolean = false;
  score: number | null = null;
  totalMarks: number = 0;
  errorMessage: string = '';
  submissionMessage: string = '';
  currentQuestionIndex: number = 0;
  showWarning: boolean = false;
  unansweredQuestions: number[] = [];
  isBackNavigation: boolean = false; // Track if navigation is from back button

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAssessment();
    // Push initial state to history to allow back button handling
    history.pushState(null, '', window.location.href);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadHandler(event: BeforeUnloadEvent): void {
    if (!this.submitted) {
      event.preventDefault();
      event.returnValue = 'You have an ongoing exam. Are you sure you want to leave?';
    }
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: PopStateEvent): void {
    if (!this.submitted) {
      event.preventDefault();
      this.isBackNavigation = true; // Mark as back navigation
      this.checkUnansweredQuestions();
      if (this.unansweredQuestions.length > 0) {
        this.errorMessage = `You have not answered the following questions: ${this.unansweredQuestions.join(', ')}. Do you still want to leave?`;
      } else {
        this.errorMessage = 'Are you sure you want to leave the exam?';
      }
      this.showWarning = true;
      history.pushState(null, '', window.location.href); // Push state again to prevent navigation
    }
  }

  loadAssessment(): void {
    const assessmentId = this.route.snapshot.queryParams['assessmentId'];
    const courseId = this.route.snapshot.queryParams['courseId'];

    if (!assessmentId || !courseId) {
      this.errorMessage = 'Missing assessment or course ID.';
      return;
    }

    this.http.get<{ assessments: Assessment[] }>(`http://localhost:3000/api/assessments/course/${courseId}`).subscribe({
      next: (data) => {
        this.assessment = data.assessments.find(a => a._id === assessmentId) || null;
        if (this.assessment) {
          console.log('Assessment loaded:', this.assessment);
          this.timeRemaining = this.assessment.timeLimit * 60;
          this.startTimer();
          this.answers = new Array(this.assessment.questions.length).fill(undefined);
          this.totalMarks = this.assessment.questions.reduce((sum, q) => sum + q.marks, 0);
        } else {
          this.errorMessage = 'Assessment not found.';
        }
      },
      error: (err) => {
        console.error('Error fetching assessment:', err);
        this.errorMessage = 'Failed to load assessment.';
      }
    });
  }

  startTimer(): void {
    this.timer = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
      } else {
        clearInterval(this.timer);
        this.submitExam();
      }
    }, 1000);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }

  selectAnswer(questionIndex: number, optionIndex: number): void {
    this.answers[questionIndex] = optionIndex + 1;
    if (questionIndex < this.assessment!.questions.length - 1) {
      this.currentQuestionIndex = questionIndex + 1;
    }
  }

  checkUnansweredQuestions(): void {
    this.unansweredQuestions = [];
    this.answers.forEach((answer, index) => {
      if (answer === undefined) {
        this.unansweredQuestions.push(index + 1);
      }
    });
  }

  confirmEndTest(): void {
    this.isBackNavigation = false; // Not a back navigation
    this.checkUnansweredQuestions();
    if (this.unansweredQuestions.length > 0) {
      this.errorMessage = `You have not answered the following questions: ${this.unansweredQuestions.join(', ')}. Do you still want to end the test?`;
      this.showWarning = true;
    } else {
      this.submitExam();
    }
  }

  submitExam(): void {
    if (!this.assessment || this.submitted) return;

    this.submitted = true;
    clearInterval(this.timer);

    // Calculate score
    this.score = 0;
    this.assessment.questions.forEach((question, index) => {
      if (this.answers[index] === question.correctAnswer) {
        this.score! += question.marks;
      }
    });

    // Submit marks to backend
    const studentId = localStorage.getItem('userId');
    const studentName = localStorage.getItem('userName') || 'Anonymous';
    const courseId = this.route.snapshot.queryParams['courseId'];

    if (!studentId || !courseId) {
      this.errorMessage = 'Missing student ID or course ID for submission.';
      return;
    }

    const markData = {
      studentId,
      studentName,
      courseId,
      marks: this.score
    };

    this.http.post('http://localhost:3000/api/assessment_mark', markData).subscribe({
      next: (response) => {
        console.log('Mark submitted:', response);
        this.submissionMessage = 'Test ended successfully! Redirecting to user page...';
        setTimeout(() => {
          this.router.navigate(['/user-page'], { queryParams: { id: studentId } });
        }, 3000);
      },
      error: (err) => {
        console.error('Error submitting mark:', err);
        this.errorMessage = 'Failed to submit marks.';
      }
    });
  }

  cancelNavigation(): void {
    this.showWarning = false;
    this.errorMessage = '';
    this.isBackNavigation = false;
  }

  confirmNavigation(): void {
    this.showWarning = false;
    if (this.isBackNavigation) {
      this.submitExam(); // Submit exam before redirecting
    } else {
      this.submitExam(); // Same behavior for "End Test"
    }
  }
}