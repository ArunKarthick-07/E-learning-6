import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  formdata = { name: '', age: 0, email: '', password: '', mobile: '', reenterPassword: '' };
  photoFile: File | null = null;
  submit = false;
  backendBaseUrl = 'http://localhost:3000';
  passwordError: string = '';
  showPassword = false;
  showReenterPassword = false;
  showRequirements = false;
  passwordCriteria = {
    minLength: false,
    uppercase: false,
    number: false
  };

  constructor(private http: HttpClient, private router: Router) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleReenterPasswordVisibility() {
    this.showReenterPassword = !this.showReenterPassword;
  }

  updatePasswordCriteria() {
    const password = this.formdata.password;
    this.passwordCriteria.minLength = password.length >= 7;
    this.passwordCriteria.uppercase = /[A-Z]/.test(password);
    this.passwordCriteria.number = /\d/.test(password);
  }

  onFileChange(event: any): void {
    this.photoFile = event.target.files[0];
    if (this.photoFile) {
      console.log('Selected photo file:', this.photoFile.name);
    }
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

  validateForm(form: NgForm): boolean {
    this.passwordError = '';
    if (!this.validatePassword(this.formdata.password)) {
      return false;
    }
    if (this.formdata.password !== this.formdata.reenterPassword) {
      this.passwordError = 'Passwords do not match.';
      return false;
    }
    return form.valid ?? false;
  }

  onSubmit(form: NgForm) {
    this.submit = true;
    if (!this.validateForm(form)) {
      console.log('Form invalid. Errors:', form.controls, 'Password Error:', this.passwordError);
      return;
    }

    console.log('User Registration Data:', JSON.stringify(this.formdata, null, 2));

    const formData = new FormData();
    formData.append('name', this.formdata.name);
    formData.append('age', this.formdata.age.toString());
    formData.append('email', this.formdata.email);
    formData.append('password', this.formdata.password);
    formData.append('mobile', this.formdata.mobile);
    if (this.photoFile) {
      formData.append('photo', this.photoFile);
    }

    this.http.post(`${this.backendBaseUrl}/api/auth/register`, formData).subscribe({
      next: (response: any) => {
        console.log('Registration Successful - Response:', JSON.stringify(response, null, 2));
        alert('Registration Successful! Please login to continue.');
        form.reset();
        this.formdata = { name: '', age: 0, email: '', password: '', mobile: '', reenterPassword: '' };
        this.photoFile = null;
        this.submit = false;
        this.passwordError = '';
        this.router.navigate(['/user-login']);
      },
      error: (error) => {
        console.error('Registration Failed - Full Error:', JSON.stringify(error, null, 2));
        if (error.error && error.error.message) {
          console.error('Backend Error Message:', error.error.message);
          alert(error.error.message);
        } else {
          console.error('No specific error message from backend');
          alert('Registration Failed. Please try again.');
        }
      }
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/user-login']).then(success => {
      console.log('Navigation to /user-login successful:', success);
    }).catch(err => {
      console.error('Navigation to /user-login failed:', err);
    });
  }
}