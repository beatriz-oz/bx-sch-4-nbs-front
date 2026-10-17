import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { Appointment } from '../../../core/api/types';
import { AuthService } from '../../../core/auth/auth.service';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { ClientApiService } from '../client-api.service';

/**
 * Opened from the reminder email (24 hours before). It confirms on its own:
 * the token in the link proves who she is, so no login is needed.
 * Opening the link twice is fine: the API keeps the first confirmation.
 */
@Component({
  selector: 'app-confirm-attendance-page',
  imports: [RouterLink, StudioDatePipe],
  templateUrl: './confirm-attendance.page.html',
})
export class ConfirmAttendancePage {
  private readonly api = inject(ClientApiService);
  protected readonly auth = inject(AuthService);

  readonly appointment = signal<Appointment | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    const token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
    if (!token) {
      this.error.set(this.invalidLink());
      return;
    }
    this.api.confirmAttendance(token).subscribe({
      next: (appointment) => this.appointment.set(appointment),
      error: (error: unknown) => this.error.set(this.messageFor(error)),
    });
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return this.invalidLink();
        case 409:
          return $localize`:@@attendance.error.notActive:This appointment is no longer active: it was cancelled or has already happened.`;
        case 404:
          return $localize`:@@attendance.error.notFound:We could not find this appointment.`;
      }
    }
    return apiErrorMessage(error);
  }

  private invalidLink(): string {
    return $localize`:@@attendance.error.invalid:This link is not valid or has expired: the deadline written in the email may have passed.`;
  }
}
