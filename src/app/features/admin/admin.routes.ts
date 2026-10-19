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
        path: 'payments',
        title: $localize`:@@title.payments:Payments · Nails by Scooby`,
        loadComponent: () => import('./payments/payments.page').then((m) => m.PaymentsPage),
      },
      {
        path: 'reports',
        title: $localize`:@@title.reports:Reports · Nails by Scooby`,
        loadComponent: () => import('./reports/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'clients',
        title: $localize`:@@title.clients:Clients · Nails by Scooby`,
        loadComponent: () => import('./clients/clients.page').then((m) => m.ClientsPage),
      },
      {
        path: 'opening-hours',
        title: $localize`:@@title.openingHours:Opening hours · Nails by Scooby`,
        loadComponent: () => import('./opening-hours/opening-hours.page').then((m) => m.OpeningHoursPage),
      },
      {
        path: 'prices',
        title: $localize`:@@title.prices:Prices · Nails by Scooby`,
        loadComponent: () => import('./prices/prices.page').then((m) => m.PricesPage),
      },
      {
        path: 'policies',
        title: $localize`:@@title.policies:Policies · Nails by Scooby`,
        loadComponent: () => import('./policies/policies.page').then((m) => m.PoliciesPage),
      },
      {
        path: 'pre-approved',
        title: $localize`:@@title.preApproved:Pre-approved Instagram · Nails by Scooby`,
        loadComponent: () => import('./pre-approved/pre-approved.page').then((m) => m.PreApprovedPage),
      },
    ],
  },
];
