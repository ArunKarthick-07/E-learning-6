import { Component } from '@angular/core';
import { Router } from '@angular/router';
import Hammer from 'hammerjs'; // Default import
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule], // Add CommonModule for *ngIf
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  showButtons: boolean = false; // Control button visibility

  constructor(private router: Router) {}

  ngAfterViewInit() {
    // Initialize Hammer.js for swipe detection
    const hammer = new Hammer(document.getElementById('home-container')!);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_VERTICAL });

    hammer.on('swipeup', () => {
      this.showButtons = true;
    });

    hammer.on('swipedown', () => {
      this.showButtons = false;
    });
  }

  navigateToUserLogin(): void {
    this.router.navigate(['/user-login']).then(success => {
      console.log('Navigation to /user-login successful:', success);
    }).catch(err => {
      console.error('Navigation to /user-login failed:', err);
    });
  }

  navigateToAdminLogin(): void {
    this.router.navigate(['/admin-login']).then(success => {
      console.log('Navigation to /admin-login successful:', success);
    }).catch(err => {
      console.error('Navigation to /admin-login failed:', err);
    });
  }

  navigateToInstructorLogin(): void {
    this.router.navigate(['/login']).then(success => {
      console.log('Navigation to /login successful:', success);
    }).catch(err => {
      console.error('Navigation to /login failed:', err);
    });
  }
}