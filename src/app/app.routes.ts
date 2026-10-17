import { Routes } from '@angular/router';

import { adminGuard, authGuard, guestGuard, homeGuard } from './core/auth/auth.guards';

// Each page is loaded only when someone opens it (loadComponent),
// so a client never downloads the admin pages.
export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [homeGuard], children: [] },
  {
    path: 'login',
    canActivate: [guestGuard],
    title: $localize`:@@title.login:Log in · Nails by Scooby`,
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'check-in',
    canActivate: [guestGuard],
    title: $localize`:@@title.checkIn:First appointment · Nails by Scooby`,
    loadComponent: () => import('./features/auth/check-in/check-in.page').then((m) => m.CheckInPage),
  },
  {
    path: 'activate',
    canActivate: [guestGuard],
    title: $localize`:@@title.activate:Create your password · Nails by Scooby`,
    loadComponent: () => import('./features/auth/activate/activate.page').then((m) => m.ActivatePage),
  },
  {
    path: 'appointments',
    canActivate: [authGuard],
    title: $localize`:@@title.appointments:My appointments · Nails by Scooby`,
    loadComponent: () => import('./features/client/client-home.page').then((m) => m.ClientHomePage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  { path: '**', redirectTo: '' },
];
