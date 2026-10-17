import { Routes } from '@angular/router';

import { AdminShell } from './admin-shell/admin-shell';

// The admin pages, all inside the admin frame (side menu).
export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminShell,
    children: [
      {
        path: '',
        title: $localize`:@@title.calendar:Calendar · Nails by Scooby`,
        loadComponent: () => import('./calendar/calendar.page').then((m) => m.CalendarPage),
      },
      {
        path: 'pre-approved',
        title: $localize`:@@title.preApproved:Pre-approved Instagram · Nails by Scooby`,
        loadComponent: () => import('./pre-approved/pre-approved.page').then((m) => m.PreApprovedPage),
      },
    ],
  },
];
