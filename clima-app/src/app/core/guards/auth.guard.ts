import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const requiredRole = route.data?.['role'];
    if (requiredRole && !authService.hasRole(requiredRole)) {
      router.navigate(['/']); // Redirigir si no tiene el rol
      return false;
    }
    return true;
  }

  router.navigate(['/login']);
  return false;
};
