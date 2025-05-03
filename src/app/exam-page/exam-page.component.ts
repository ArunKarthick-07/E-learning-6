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
  isBackNavigation: boolean = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAssessment();
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
      this.isBackNavigation = true;
      this.checkUnansweredQuestions();
      if (this.unansweredQuestions.length > 0) {
        this.errorMessage = `You have not answered the following questions: ${this.unansweredQuestions.join(', ')}. Do you still want to leave?`;
      } else {
        this.errorMessage = 'Are you sure you want to leave the exam?';
      }
      this.showWarning = true;
      history.pushState(null, '', window.location.href);
    }
  }

  loadAssessment(): void {
    const assessmentId = this.route.snapshot.queryParams['assessmentId'];
    const courseId = this.route.snapshot.queryParams['courseId'];
    const userId = localStorage.getItem('userId');

    if (!assessmentId || !courseId || !userId) {
      this.errorMessage = 'Missing assessment, course, or user ID.';
      return;
    }

    // Check for existing submission to prevent retaking the assessment
    this.http.get(`http://localhost:3000/api/assessment_mark/answers/${userId}/${assessmentId}`).subscribe({
      next: () => {
        this.submitted = true;
        this.errorMessage = 'You have already submitted this assessment. Redirecting to user page...';
        setTimeout(() => {
          this.router.navigate(['/user-page'], { queryParams: { id: userId } });
        }, 3000);
      },
      error: (err) => {
        if (err.status === 404) {
          // No submission found, proceed to load the assessment
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
              this.errorMessage = 'Failed to load assessment: ' + (err.statusText || err.message || 'Unknown error');
            }
          });
        } else {
          console.error('Error checking submission status:', err);
          this.errorMessage = 'Error checking submission status: ' + (err.statusText || err.message || 'Unknown error');
        }
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
    this.isBackNavigation = false;
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

    // Prepare answers for submission
    const formattedAnswers = this.answers.map((answer, index) => ({
      questionIndex: index,
      selectedAnswer: answer || 0 // Use 0 for unanswered questions
    }));

    // Submit marks and answers to backend
    const userId = localStorage.getItem('userId');
    const assessmentId = this.assessment._id;

    if (!userId || !assessmentId) {
      this.errorMessage = 'Missing user ID or assessment ID for submission.';
      return;
    }

    const submissionData = {
      userId,
      assessmentId,
      answers: formattedAnswers,
      marks: this.score
    };

    console.log('Submitting assessment:', submissionData);

    this.http.post('http://localhost:3000/api/assessment_mark/submit', submissionData).subscribe({
      next: (response) => {
        console.log('Assessment submitted:', response);
        this.submissionMessage = 'Test ended successfully! Redirecting to user page...';
        setTimeout(() => {
          this.router.navigate(['/user-page'], { queryParams: { id: userId } });
        }, 3000);
      },
      error: (err) => {
        console.error('Error submitting assessment:', err);
        this.errorMessage = 'Failed to submit assessment: ' + (err.statusText || err.message || 'Unknown error');
        this.submitted = false; // Allow retry on failure
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
      this.submitExam();
    } else {
      this.submitExam();
    }
  }
}