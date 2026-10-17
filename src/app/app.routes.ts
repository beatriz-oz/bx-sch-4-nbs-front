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
    path: 'appointments',
    canActivate: [authGuard],
    title: $localize`:@@title.appointments:My appointments · Nails by Scooby`,
    loadComponent: () => import('./features/client/client-home.page').then((m) => m.ClientHomePage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    title: $localize`:@@title.admin:Dashboard · Nails by Scooby`,
    loadComponent: () => import('./features/admin/admin-home.page').then((m) => m.AdminHomePage),
  },
  { path: '**', redirectTo: '' },
];
