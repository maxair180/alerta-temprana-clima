import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ClimaService } from '../../services/clima.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const climaService = inject(ClimaService);
  const token = climaService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
