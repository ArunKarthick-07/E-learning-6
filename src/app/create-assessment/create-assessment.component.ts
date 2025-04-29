import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgForm } from '@angular/forms';

interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
  marks: number;
}

interface Assessment {
  title: string;
  questions: Question[];
  timeLimit: number;
  instructorId: string;
  courseId: string;
}

interface Course {
  _id: string;
  title: string;
}

@Component({
  selector: 'app-create-assessment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-assessment.component.html',
  styleUrls: ['./create-assessment.component.css']
})
export class CreateAssessmentComponent implements OnInit {
  assessment: Assessment = {
    title: '',
    questions: [{ text: '', options: ['', '', '', ''], correctAnswer: 1, marks: 1 }],
    timeLimit: 30,
    instructorId: '',
    courseId: ''
  };
  courses: Course[] = [];
  selectedCourseId: string = '';
  loading: boolean = true;

  constructor(private http: HttpClient, private router: Router) {
    this.assessment.instructorId = localStorage.getItem('instructorId') || '';
  }

  ngOnInit(): void {
    this.fetchCourses();
  }

  fetchCourses(): void {
    const instructorId = localStorage.getItem('instructorId');
    console.log('Fetching courses for instructorId:', instructorId);
    if (instructorId) {
      this.http
        .get<any>(`http://localhost:3000/api/courses/instructor/${instructorId}`)
        .subscribe(
          (response: any) => {
            console.log('Raw courses data:', response);
            this.courses = (response.courses || []).map((course: any) => ({
              _id: course._id,
              title: course.title || course.name || 'Unnamed Course'
            }));
            console.log('Mapped courses:', this.courses);
            if (this.courses.length > 0) {
              this.assessment.courseId = this.courses[0]._id;
              this.selectedCourseId = this.courses[0]._id;
              console.log('Default course set to:', this.courses[0].title);
            }
            this.loading = false;
          },
          (error: any) => {
            console.error('Error fetching courses:', error);
            console.log('Error status:', error.status, 'Error message:', error.message);
            this.loading = false;
          }
        );
    } else {
      console.log('No instructorId found in localStorage');
      this.loading = false;
    }
  }

  addQuestion(): void {
    this.assessment.questions.push({ text: '', options: ['', '', '', ''], correctAnswer: 1, marks: 1 });
  }

  removeQuestion(index: number): void {
    if (this.assessment.questions.length > 1) {
      this.assessment.questions.splice(index, 1);
    }
  }

  onOptionChange(questionIndex: number, optionIndex: number): void {
    // Prevent unnecessary re-rendering by avoiding complex logic here
    console.log(`Option changed at [${questionIndex}, ${optionIndex}]:`, this.assessment.questions[questionIndex].options[optionIndex]);
  }

  onSubmit(form: NgForm): void {
    if (form.valid) {
      this.assessment.courseId = this.selectedCourseId;
      console.log('Submitting assessment:', JSON.stringify(this.assessment, null, 2));
      this.http
        .post('http://localhost:3000/api/assessments/create', this.assessment)
        .subscribe(
          (response: any) => {
            console.log('Assessment created:', response);
            alert('Assessment created successfully!');
            this.goBack();
          },
          (error: any) => {
            console.error('Error creating assessment:', error);
            alert('Failed to create assessment. Please try again.');
          }
        );
    } else {
      console.log('Form is invalid', form.errors);
    }
  }

  goBack(): void {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    console.log('Before navigation to /instructor-page (goBack), localStorage:', {
      isLoggedIn: localStorage.getItem('isLoggedIn'),
      username: localStorage.getItem('username'),
      instructorId: localStorage.getItem('instructorId')
    });

    if (!isLoggedIn) {
      console.log('User not logged in, redirecting to login');
      this.router.navigate(['/']);
      return;
    }

    this.router.navigate(['/instructor-page']).then(success => {
      console.log('Navigation to /instructor-page successful:', success);
    }).catch(err => {
      console.error('Navigation to /instructor-page failed:', err);
    });
  }

  trackByQuestion(index: number, question: Question): number {
    return index;
  }

  trackByOption(index: number, option: string): number {
    return index;
  }
}