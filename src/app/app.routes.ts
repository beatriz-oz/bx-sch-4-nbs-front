import { Routes } from '@angular/router';

import { adminGuard, authGuard, guestGuard, homeGuard } from './core/auth/auth.guards';

// Each page is loaded only when someone opens it (loadComponent),
// so a client never downloads the admin pages.
// data.texture: the studio's texture as the page background, with a plain white header (see app.html).
const TEXTURE = { texture: true };
export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [homeGuard], children: [] },
  {
    path: 'login',
    canActivate: [guestGuard],
    data: TEXTURE,
    title: $localize`:@@title.login:Log in · Nails by Scooby`,
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'check-in',
    canActivate: [guestGuard],
    data: TEXTURE,
    title: $localize`:@@title.checkIn:First appointment · Nails by Scooby`,
    loadComponent: () => import('./features/auth/check-in/check-in.page').then((m) => m.CheckInPage),
  },
  {
    path: 'activate',
    data: TEXTURE,
    // Open to a logged-in one-off client too: she creates her password after booking.
    title: $localize`:@@title.activate:Create your password · Nails by Scooby`,
    loadComponent: () => import('./features/auth/activate/activate.page').then((m) => m.ActivatePage),
  },
  {
    path: 'book',
    canActivate: [authGuard],
    title: $localize`:@@title.book:Book an appointment · Nails by Scooby`,
    loadComponent: () => import('./features/client/booking/booking.page').then((m) => m.BookingPage),
  },
  {
    path: 'appointments',
    canActivate: [authGuard],
    title: $localize`:@@title.appointments:My appointments · Nails by Scooby`,
    loadComponent: () =>
      import('./features/client/my-appointments/my-appointments.page').then((m) => m.MyAppointmentsPage),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    title: $localize`:@@title.profile:My profile · Nails by Scooby`,
    loadComponent: () => import('./features/client/profile/profile.page').then((m) => m.ProfilePage),
  },
  {
    // Public: anyone can see how much a service costs, without logging in.
    path: 'prices',
    data: TEXTURE,
    title: $localize`:@@title.simulator:Prices · Nails by Scooby`,
    loadComponent: () =>
      import('./features/public/price-simulator/price-simulator.page').then((m) => m.PriceSimulatorPage),
  },
  {
    // The link in the reminder email. No login needed: the token in the link is the proof.
    path: 'confirm-attendance',
    title: $localize`:@@title.attendance:Confirm attendance · Nails by Scooby`,
    loadComponent: () =>
      import('./features/client/confirm-attendance/confirm-attendance.page').then((m) => m.ConfirmAttendancePage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  { path: '**', redirectTo: '' },
];
