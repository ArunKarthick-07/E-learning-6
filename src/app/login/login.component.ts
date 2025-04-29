import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

interface Instructor {
  username: string;
  password: string;
}

interface ResetInstructor {
  username: string;
  newPassword: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  instructor: Instructor = { username: '', password: '' };
  resetInstructor: ResetInstructor = { username: '', newPassword: '' };
  isLoading = false;
  showResetForm = false;

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit(form: NgForm): void {
    if (form.valid) {
      this.isLoading = true;
      console.log('Login attempt:', this.instructor);

      this.http.post('http://localhost:3000/api/auth/login', this.instructor).subscribe(
        (response: any) => {
          console.log('Login successful:', response);
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('instructorId', response.instructor.id);
          localStorage.setItem('username', response.instructor.username);
          this.isLoading = false;
          this.router.navigate(['/instructor-page']);
        },
        (error: any) => {
          console.error('Login error:', error);
          alert(error.error?.message || 'Invalid username or password');
          this.isLoading = false;
        }
      );
    } else {
      console.log('Form is invalid');
    }
  }

  toggleResetForm(): void {
    this.showResetForm = !this.showResetForm;
    this.resetInstructor = { username: '', newPassword: '' }; // Reset the form
  }

  onResetPassword(form: NgForm): void {
    if (form.valid) {
      this.isLoading = true;
      console.log('Reset password attempt:', this.resetInstructor);

      this.http.post('http://localhost:3000/api/auth/reset-password', this.resetInstructor).subscribe(
        (response: any) => {
          console.log('Password reset successful:', response);
          alert('Password reset successful! Please log in with your new password.');
          this.isLoading = false;
          this.showResetForm = false;
        },
        (error: any) => {
          console.error('Reset password error:', error);
          alert(error.error?.message || 'Failed to reset password. Please try again.');
          this.isLoading = false;
        }
      );
    } else {
      console.log('Reset form is invalid');
    }
  }
}