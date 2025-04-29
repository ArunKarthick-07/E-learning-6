import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  age?: number;
  photo?: string;
  password?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: User = { id: '', name: '', email: '' };
  editedUser: User = { id: '', name: '', email: '' };
  errorMessage: string = '';
  successMessage: string = '';
  passwordError: string = ''; // Specific error for password validation
  photoFile: File | null = null;
  isEditMode: boolean = false;
  apiUrl: string = 'http://localhost:3000';
  reenterPassword: string = ''; // New field for re-enter password

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        console.log('Navigation ended at:', event.url);
      }
    });
  }

  ngOnInit(): void {
    console.log('ProfileComponent initialized');
    const userId = this.route.snapshot.queryParams['id'] || localStorage.getItem('userId');
    console.log('User ID for profile:', userId);
    if (userId) {
      this.loadUserProfile(userId);
    } else {
      console.error('No userId found for profile - redirecting to home');
      this.router.navigate(['/']).then(() => {
        console.log('Redirected to home due to missing userId');
      });
    }
  }

  loadUserProfile(userId: string): void {
    console.log('Fetching user profile for userId:', userId);
    this.http.get<User>(`http://localhost:3000/api/users/${userId}`).subscribe({
      next: (user) => {
        console.log('User profile loaded successfully:', user);
        if (!user.name || !user.email) {
          console.error('User data missing required fields:', user);
          this.errorMessage = 'Profile data incomplete.';
          this.router.navigate(['/']).then(() => {
            console.log('Redirected to home due to incomplete user data');
          });
          return;
        }
        this.user = { ...user };
        this.editedUser = { ...user };
        if (this.user.photo) {
          this.user.photo = `${this.apiUrl}${this.user.photo}`;
          this.editedUser.photo = this.user.photo;
        }
      },
      error: (err) => {
        console.error('Error loading user profile:', err);
        this.errorMessage = 'Failed to load profile.';
        this.router.navigate(['/']).then(() => {
          console.log('Redirected to home due to profile load failure');
        });
      }
    });
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (!this.isEditMode) {
      this.editedUser = { ...this.user };
      this.photoFile = null;
      this.errorMessage = '';
      this.successMessage = '';
      this.passwordError = '';
      this.reenterPassword = '';
    }
  }

  onFileChange(event: any): void {
    this.photoFile = event.target.files[0];
    if (this.photoFile) {
      console.log('Selected photo file:', this.photoFile.name);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editedUser.photo = e.target.result;
      };
      reader.readAsDataURL(this.photoFile);
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

  validateForm(): boolean {
    // Validate password requirements
    if (this.editedUser.password && !this.validatePassword(this.editedUser.password)) {
      return false;
    }

    // Validate re-enter password match
    if (this.editedUser.password && this.editedUser.password !== this.reenterPassword) {
      this.passwordError = 'Passwords do not match.';
      return false;
    }

    return true;
  }

  saveProfile(): void {
    if (!this.validateForm()) {
      return;
    }

    const userId = this.user.id || localStorage.getItem('userId');
    if (!userId) {
      this.errorMessage = 'No user ID found.';
      return;
    }

    const formData = new FormData();
    formData.append('name', this.editedUser.name);
    formData.append('email', this.editedUser.email);
    if (this.editedUser.mobile) formData.append('mobile', this.editedUser.mobile);
    if (this.editedUser.age) formData.append('age', this.editedUser.age.toString());
    if (this.editedUser.password) formData.append('password', this.editedUser.password);
    if (this.photoFile) formData.append('photo', this.photoFile);

    this.http.put(`http://localhost:3000/api/users/${userId}`, formData).subscribe({
      next: (updatedUser: any) => {
        this.user = { ...updatedUser };
        this.user.photo = updatedUser.photo ? `${this.apiUrl}${updatedUser.photo}` : '';
        this.editedUser = { ...this.user };
        localStorage.setItem('userName', this.user.name);
        localStorage.setItem('userEmail', this.user.email);
        localStorage.setItem('userPhoto', this.user.photo || '');
        this.successMessage = 'Profile updated successfully!';
        this.errorMessage = '';
        this.passwordError = '';
        this.reenterPassword = '';
        this.isEditMode = false;
        this.photoFile = null;
        console.log('Profile updated:', this.user);
      },
      error: (err) => {
        console.error('Error updating profile:', err);
        this.errorMessage = 'Failed to update profile.';
      }
    });
  }

  cancelEdit(): void {
    this.editedUser = { ...this.user };
    this.photoFile = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.passwordError = '';
    this.reenterPassword = '';
    this.isEditMode = false;
  }
}