import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.css']
})
export class UserLoginComponent {
  email: string = '';
  password: string = '';
  backendBaseUrl = 'http://localhost:3000';
  showResetForm: boolean = false; // Toggle between login and reset forms
  resetEmail: string = ''; // Email for password reset
  newPassword: string = ''; // New password
  reenterPassword: string = ''; // Re-enter new password
  passwordError: string = ''; // Specific error for password validation
  resetSuccessMessage: string = ''; // Success message for reset

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit(form: NgForm) {
    if (!form.valid) {
      alert('Please fill all fields correctly.');
      return;
    }
  
    const loginData = { email: this.email, password: this.password };
    console.log('User Login Attempt:', JSON.stringify(loginData, null, 2));
  
    this.http.post(`${this.backendBaseUrl}/api/auth/user-login`, loginData).subscribe({
      next: (response: any) => {
        console.log('Login successful - Response:', JSON.stringify(response, null, 2));
        localStorage.setItem('userId', response.user.id);
        localStorage.setItem('userName', response.user.name);
        localStorage.setItem('userEmail', response.user.email);
        this.router.navigate(['/user-page']).then(success => {
          console.log('Navigation to /user-page successful:', success);
        }).catch(err => {
          console.error('Navigation to /user-page failed:', err);
        });
      },
      error: (err) => {
        console.error('Login failed - Full Error:', JSON.stringify(err, null, 2));
        if (err.error && err.error.message) {
          console.error('Backend Error Message:', err.error.message);
          alert(err.error.message);
        } else {
          console.error('No specific error message from backend');
          alert('Login failed. Please try again.');
        }
      }
    });
  }

  toggleResetForm(): void {
    this.showResetForm = !this.showResetForm;
    this.resetEmail = '';
    this.newPassword = '';
    this.reenterPassword = '';
    this.passwordError = '';
    this.resetSuccessMessage = '';
  }

  validatePassword(password: string): boolean {
    const minLength = 7;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (password.length < minLength) {
      this.passwordError = 'Password must be at least 7 characters long.';
      return false;
    }
    if (!hasUpperCase) {
      this.passwordError = 'Password must contain at least one uppercase letter.';
      return false;
    }
    if (!hasNumber) {
      this.passwordError = 'Password must contain at least one number.';
      return false;
    }
    this.passwordError = '';
    return true;
  }

  validateResetForm(form: NgForm): boolean {
    if (!form.valid) {
      return false;
    }
    if (!this.validatePassword(this.newPassword)) {
      return false;
    }
    if (this.newPassword !== this.reenterPassword) {
      this.passwordError = 'Passwords do not match.';
      return false;
    }
    return true;
  }

  onResetPassword(form: NgForm) {
    if (!this.validateResetForm(form)) {
      return;
    }

    const resetData = { email: this.resetEmail, newPassword: this.newPassword };
    this.http.post(`${this.backendBaseUrl}/api/auth/reset-user-password`, resetData).subscribe({
      next: (response: any) => {
        console.log('Password reset successful:', response);
        this.resetSuccessMessage = 'Password reset successful! Please login with your new password.';
        this.passwordError = '';
        setTimeout(() => {
          this.toggleResetForm();
        }, 2000);
      },
      error: (err) => {
        console.error('Password reset failed:', err);
        this.passwordError = err.error?.message || 'Failed to reset password. Please try again.';
        this.resetSuccessMessage = '';
      }
    });
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']).then(success => {
      console.log('Navigation to /register successful:', success);
    }).catch(err => {
      console.error('Navigation to /register failed:', err);
    });
  }
}