import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.isLoading = true;
    this.error = '';
    
    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.router.navigate(['/']); 
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'Credenciales incorrectas o usuario inactivo';
        console.error(err);
      }
    });
  }
}
