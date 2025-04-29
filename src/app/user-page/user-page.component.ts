import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Course {
  id: string;
  title: string;
  description: string;
  contents: string;
  instructorId: string;
  price: number;
  thumbnail: string;
  pdfs?: string[];
  youtubeLinks?: string[];
  youtubeLink?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  photo?: string;
}

interface PaymentDetails {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
}

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

interface Mark {
  assessmentId: string;
  assessmentName: string;
  marks: number;
  courseName: string;
  date: Date;
}

interface UserAnswer {
  questionIndex: number;
  selectedAnswer: number;
}

interface ReviewData {
  assessment: Assessment;
  userAnswers: UserAnswer[];
}

declare const jspdf: any;

@Component({
  selector: 'app-user-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-page.component.html',
  styleUrls: ['./user-page.component.css']
})
export class UserPageComponent implements OnInit {
  userName: string = '';
  enrolledCourses: Course[] = [];
  availableCourses: Course[] = [];
  selectedCourse: Course | null = null;
  assessments: Assessment[] = [];
  showPaymentModal: boolean = false;
  selectedCourseForPayment: Course | null = null;
  paymentDetails: PaymentDetails = { cardNumber: '', expiryDate: '', cvv: '' };
  paymentError: string = '';
  marks: Mark[] = [];
  showReviewModal: boolean = false;
  reviewData: ReviewData | null = null;
  showCourseDetails: { [key: string]: boolean } = {};

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('userName') || 'User';
    console.log('Initial userName from localStorage:', this.userName);

    this.route.queryParams.subscribe(params => {
      console.log('Query params:', params);
      if (params['name']) {
        this.userName = params['name'];
        console.log('Updated userName from query params:', this.userName);
      }
      const userId = params['id'] || localStorage.getItem('userId');
      console.log('User ID:', userId, '(from query:', params['id'], ', localStorage:', localStorage.getItem('userId'), ')');
      if (userId) {
        this.loadEnrolledCourses(userId);
        this.loadAvailableCourses(userId);
        this.loadPastMarks(userId);
        if (params['refreshMarks'] === 'true') {
          console.log('Refreshing marks after exam submission');
          this.loadPastMarks(userId);
        }
        if (this.userName === 'User' && (params['email'] || localStorage.getItem('userEmail'))) {
          this.fetchUserName(params['email'] || localStorage.getItem('userEmail') || '');
        }
      } else {
        console.error('No userId provided in query params or localStorage');
      }
    });

    const storedCourses = localStorage.getItem('selectedCourses');
    if (storedCourses) {
      this.enrolledCourses = JSON.parse(storedCourses);
      console.log('Loaded enrolled courses from localStorage:', this.enrolledCourses);
      this.enrolledCourses = this.enrolledCourses.map(course => this.normalizeCourse(course));
      localStorage.setItem('selectedCourses', JSON.stringify(this.enrolledCourses));
    } else {
      console.log('No enrolled courses in localStorage');
    }
  }

  loadPastMarks(userId: string): void {
    console.log('Fetching marks for userId:', userId);
    this.http.get<{ message: string; marks: Mark[] }>(`http://localhost:3000/api/assessment_mark/student/${userId}`).subscribe({
      next: (data) => {
        console.log('Raw API response for marks:', data);
        if (data.message === 'No marks found for this student') {
          console.log('No marks found in response');
          this.marks = [];
        } else {
          this.marks = data.marks.map(mark => ({
            ...mark,
            assessmentId: mark.assessmentId || ''
          }));
        }
        console.log('Past marks loaded:', this.marks);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading past marks:', err);
        this.marks = [];
        this.cdr.detectChanges();
      }
    });
  }

  normalizeCourse(course: Course): Course {
    if (course.youtubeLink && !course.youtubeLinks) {
      console.log(`Normalizing course "${course.title}": Converting youtubeLink to youtubeLinks`, course.youtubeLink);
      course.youtubeLinks = [course.youtubeLink];
      delete course.youtubeLink;
    }
    return course;
  }

  loadEnrolledCourses(userId: string): void {
    this.http.get<Course[]>(`http://localhost:3000/api/enrollments/${userId}`).subscribe({
      next: (courses) => {
        console.log('Step 1: Raw API response for enrolled courses:', JSON.stringify(courses, null, 2));
        this.enrolledCourses = courses.map(course => {
          course = this.normalizeCourse(course);
          const rawLinks = course.youtubeLinks || [];
          console.log(`Step 2: Processing course "${course.title}" - Raw youtubeLinks:`, rawLinks);
          const sanitizedLinks = rawLinks.map(link => this.sanitizeUrl(link)).filter(link => link !== '');
          console.log(`Step 3: Course "${course.title}" - Sanitized youtubeLinks:`, sanitizedLinks);
          return {
            ...course,
            youtubeLinks: sanitizedLinks.length > 0 ? sanitizedLinks : undefined,
            thumbnail: course.thumbnail || ''
          };
        });
        console.log('Step 4: Final processed enrolled courses:', JSON.stringify(this.enrolledCourses, null, 2));
        localStorage.setItem('selectedCourses', JSON.stringify(this.enrolledCourses));
        this.enrolledCourses.forEach(course => {
          this.showCourseDetails[course.id] = false;
        });
      },
      error: (err) => {
        console.error('Error fetching enrolled courses:', err);
      }
    });
  }

  loadAvailableCourses(userId: string): void {
    this.http.get<Course[]>(`http://localhost:3000/api/courses/available/${userId}`).subscribe({
      next: (courses) => {
        this.availableCourses = courses.map(course => this.normalizeCourse(course));
        console.log('Available courses:', this.availableCourses);
      },
      error: (err) => {
        console.error('Error fetching available courses:', err);
      }
    });
  }

  loadAssessments(courseId: string): void {
    if (!this.selectedCourse?.instructorId) {
      console.error('No instructorId available to load assessments');
      this.assessments = [];
      return;
    }
    this.http.get<{ assessments: Assessment[] }>(`http://localhost:3000/api/assessments/instructor/${this.selectedCourse.instructorId}`).subscribe({
      next: (response) => {
        this.assessments = response.assessments.filter(assessment => assessment.courseId === courseId);
        console.log('Assessments for course:', this.assessments);
        this.cdr.detectChanges(); // Ensure UI updates after async operation
      },
      error: (err) => {
        console.error('Error fetching assessments:', err);
        this.assessments = [];
        this.cdr.detectChanges();
      }
    });
  }

  selectCourse(course: Course): void {
    this.selectedCourse = { ...this.normalizeCourse(course) };
    console.log('Step 5: Selected course details:', JSON.stringify(this.selectedCourse, null, 2));
    console.log('Step 6: Selected course youtubeLinks:', this.selectedCourse.youtubeLinks);
    this.loadAssessments(course.id);
  }

  toggleCourseDetails(courseId: string): void {
    // Find the course to set as selectedCourse
    const course = this.enrolledCourses.find(c => c.id === courseId);
    if (course) {
      this.selectedCourse = { ...this.normalizeCourse(course) };
      this.showCourseDetails[courseId] = !this.showCourseDetails[courseId];
      if (this.showCourseDetails[courseId]) {
        this.loadAssessments(courseId);
      } else {
        this.assessments = []; // Clear assessments when collapsing
      }
    } else {
      console.error(`Course with id ${courseId} not found`);
    }
  }

  hasTakenAssessment(assessmentId: string): boolean {
    console.log('Checking if assessment', assessmentId, 'was taken. Marks:', this.marks);
    const hasTaken = this.marks.some(mark => mark.assessmentId === assessmentId);
    console.log('Has taken assessment:', hasTaken);
    return hasTaken;
  }

  startAssessment(assessmentId: string): void {
    console.log('Attempting to start assessment:', assessmentId);
    if (this.hasTakenAssessment(assessmentId)) {
      console.log('Assessment already taken, preventing re-attempt');
      return;
    }

    const confirmed = confirm('Are you sure you want to start this assessment? You can only attempt it once.');
    if (!confirmed) {
      console.log('User cancelled the assessment start');
      return;
    }

    console.log('Navigating to exam with params:', { assessmentId, instructorId: this.selectedCourse?.instructorId, courseId: this.selectedCourse?.id });
    this.router.navigate(['/exam'], { 
      queryParams: { 
        assessmentId, 
        instructorId: this.selectedCourse?.instructorId,
        courseId: this.selectedCourse?.id,
        refreshMarks: 'true'
      } 
    });
  }

  reviewExam(assessmentId: string): void {
    console.log('Reviewing assessment:', assessmentId);
    if (!assessmentId) {
      console.error('No assessmentId provided for review');
      alert('Invalid assessment ID.');
      return;
    }

    const userId = this.route.snapshot.queryParams['id'] || localStorage.getItem('userId');
    if (!userId) {
      console.error('No userId found for review');
      alert('User ID not found.');
      return;
    }

    this.http.get<Assessment>(`http://localhost:3000/api/assessments/${assessmentId}`).subscribe({
      next: (assessment) => {
        console.log('Fetched assessment:', assessment);
        this.http.get<UserAnswer[]>(`http://localhost:3000/api/assessment_mark/answers/${userId}/${assessmentId}`).subscribe({
          next: (userAnswers) => {
            console.log('Fetched user answers:', userAnswers);
            this.reviewData = { assessment, userAnswers };
            this.showReviewModal = true;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error fetching user answers:', err);
            alert('Failed to load user answers: ' + (err.statusText || err.message || 'Unknown error'));
          }
        });
      },
      error: (err) => {
        console.error('Error fetching assessment details:', err);
        alert('Failed to load assessment details: ' + (err.statusText || err.message || 'Unknown error'));
      }
    });
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.reviewData = null;
  }

  getAssessmentTitle(): string {
    return this.reviewData?.assessment?.title || '';
  }

  getAssessmentQuestions(): { text: string; options: string[]; correctAnswer: number; marks: number }[] {
    return this.reviewData?.assessment?.questions || [];
  }

  getUserAnswer(qIndex: number): number | undefined {
    return this.reviewData?.userAnswers?.[qIndex]?.selectedAnswer;
  }

  initiateEnrollment(course: Course): void {
    this.selectedCourseForPayment = this.normalizeCourse(course);
    this.showPaymentModal = true;
    this.paymentDetails = { cardNumber: '', expiryDate: '', cvv: '' };
    this.paymentError = '';
    console.log('Initiating enrollment for course:', course.id);
  }

  confirmPayment(): void {
    if (!this.validatePaymentDetails()) {
      return;
    }

    if (this.selectedCourseForPayment) {
      const userId = this.route.snapshot.queryParams['id'] || localStorage.getItem('userId');
      if (userId) {
        console.log('Payment details:', this.paymentDetails);
        this.http.post('http://localhost:3000/api/enrollments', {
          studentId: userId,
          courseId: this.selectedCourseForPayment.id
        }).subscribe({
          next: () => {
            console.log('Enrollment successful for course:', this.selectedCourseForPayment?.id);
            this.loadEnrolledCourses(userId);
            this.loadAvailableCourses(userId);

            this.generateReceipt();

            this.showPaymentModal = false;
            this.selectedCourseForPayment = null;
            this.paymentDetails = { cardNumber: '', expiryDate: '', cvv: '' };

            alert('Payment successful! You are now enrolled.');
          },
          error: (err) => {
            console.error('Error enrolling in course:', err);
            alert('Enrollment failed: ' + (err.error?.message || 'Unknown error'));
            this.showPaymentModal = false;
            this.selectedCourseForPayment = null;
            this.paymentDetails = { cardNumber: '', expiryDate: '', cvv: '' };
          }
        });
      } else {
        console.error('No userId for enrollment');
        alert('Enrollment failed: No user ID found.');
        this.showPaymentModal = false;
        this.selectedCourseForPayment = null;
      }
    }
  }

  validatePaymentDetails(): boolean {
    const { cardNumber, expiryDate, cvv } = this.paymentDetails;

    const cardNumberRegex = /^\d{16}$/;
    const expiryDateRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    const cvvRegex = /^\d{3}$/;

    if (!cardNumberRegex.test(cardNumber.replace(/\s/g, ''))) {
      this.paymentError = 'Invalid card number. Must be 16 digits.';
      return false;
    }
    if (!expiryDateRegex.test(expiryDate)) {
      this.paymentError = 'Invalid expiry date. Format: MM/YY';
      return false;
    }
    if (!cvvRegex.test(cvv)) {
      this.paymentError = 'Invalid CVV. Must be 3 digits.';
      return false;
    }

    const [monthStr, yearStr] = expiryDate.split('/');
    const month = +monthStr;
    const year = +yearStr;
    const fullYear = 2000 + year;
    const expiry = new Date(fullYear, month - 1, 1);
    const now = new Date();
    if (expiry < now) {
      this.paymentError = 'Card has expired.';
      return false;
    }

    this.paymentError = '';
    return true;
  }

  cancelPayment(): void {
    this.showPaymentModal = false;
    this.selectedCourseForPayment = null;
    this.paymentDetails = { cardNumber: '', expiryDate: '', cvv: '' };
    this.paymentError = '';
    console.log('Payment cancelled');
  }

  fetchUserName(email: string): void {
    if (!email) {
      console.warn('No email provided for fetchUserName');
      return;
    }
    const userId = localStorage.getItem('userId');
    this.http.get<User>(`http://localhost:3000/api/users/${userId}`).subscribe({
      next: (user) => {
        this.userName = user.name || 'User';
        localStorage.setItem('userName', this.userName);
        localStorage.setItem('userEmail', user.email || '');
        localStorage.setItem('userPhoto', user.photo || '');
        console.log('Fetched user details:', user);
      },
      error: (err) => {
        console.error('Error fetching user name:', err);
      }
    });
  }

  goToProfile(): void {
    const userId = localStorage.getItem('userId');
    console.log('Attempting to navigate to /profile with userId:', userId);
    if (userId) {
      this.router.navigate(['/profile'], { queryParams: { id: userId } }).then(success => {
        console.log('Navigation to /profile successful:', success);
      }).catch(err => {
        console.error('Navigation to /profile failed:', err);
      });
    } else {
      console.error('No userId found for profile navigation');
      this.router.navigate(['/user-page']);
    }
  }

  sanitizeUrl(url: string): string {
    if (!url) {
      console.warn('Empty YouTube URL');
      return '';
    }

    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    console.log('Sanitizing URL - Input:', url, 'Normalized:', normalizedUrl);
    if (!normalizedUrl.match(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=/i)) {
      console.warn('Invalid YouTube URL - Rejected:', normalizedUrl);
      return '';
    }
    console.log('Valid YouTube URL - Sanitized:', normalizedUrl);
    return normalizedUrl;
  }

  generateReceipt(): void {
    if (!this.selectedCourseForPayment) {
      console.error('No selected course for payment to generate receipt');
      return;
    }

    if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
      console.error('jsPDF is not available. Ensure the CDN is loaded.');
      return;
    }

    try {
      const { title, price } = this.selectedCourseForPayment;
      const doc = new jspdf.jsPDF();
      const date = new Date().toLocaleDateString();

      doc.setFontSize(20);
      doc.text('aa E-learning', 105, 20, { align: 'center' });

      doc.setFontSize(18);
      doc.text('Receipt', 105, 35, { align: 'center' });

      doc.setFontSize(12);
      doc.setLineWidth(0.5);
      doc.rect(20, 50, 170, 10);
      doc.text('Description', 22, 56);
      doc.line(80, 50, 80, 60);
      doc.text('Amount', 82, 56);

      doc.rect(20, 60, 170, 10);
      doc.text(`Course: ${title}`, 22, 66);
      doc.line(80, 60, 80, 70);
      doc.text(`$${price}`, 82, 66);

      doc.setFontSize(12);
      doc.text(`User: ${this.userName}`, 20, 80);
      doc.text(`Date: ${date}`, 20, 90);
      doc.text('Thank you for your purchase!', 20, 100);

      doc.save(`receipt_${title}_${date.replace(/\//g, '-')}.pdf`);
      console.log('Receipt generated and download triggered');
    } catch (error) {
      console.error('Error generating receipt:', error);
    }
  }

  logout(): void {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhoto');
    localStorage.removeItem('selectedCourses');
    this.router.navigate(['/']);
    console.log('User logged out');
  }
}