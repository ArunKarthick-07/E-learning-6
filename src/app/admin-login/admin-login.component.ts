import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent {
  username: string = '';
  password: string = '';
  // Default admin credentials (hardcoded in frontend)
  private defaultUsername = 'admin';
  private defaultPassword = 'Admin1234';

  constructor(private router: Router) {}

  onSubmit(form: NgForm) {
    if (!form.valid) {
      alert('Please fill all fields correctly.');
      return;
    }

    console.log('Admin Login Attempt:', { username: this.username, password: this.password });

    // Validate against hardcoded default credentials
    if (this.username === this.defaultUsername && this.password === this.defaultPassword) {
      console.log('Admin Login successful');
      localStorage.setItem('adminId', 'default-admin-id'); // Simple placeholder ID
      localStorage.setItem('adminUsername', this.defaultUsername);
      this.router.navigate(['/admin-page']).then(success => {
        console.log('Navigation to /admin-page successful:', success);
      }).catch(err => {
        console.error('Navigation to /admin-page failed:', err);
      });
    } else {
      console.error('Admin Login failed: Invalid credentials');
      alert('Invalid admin credentials. Please try again.');
    }
  }
  
}