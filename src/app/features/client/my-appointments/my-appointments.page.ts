import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { Appointment, Cancellation } from '../../../core/api/types';
import { AuthService } from '../../../core/auth/auth.service';
import { ClientApiService } from '../client-api.service';
import { AppointmentCard } from './appointment-card';
import { ClientCancelDialog } from './client-cancel-dialog';

/** The client's appointments: the next ones first, then the history. */
@Component({
  selector: 'app-my-appointments-page',
  imports: [RouterLink, AppointmentCard, ClientCancelDialog],
  templateUrl: './my-appointments.page.html',
})
export class MyAppointmentsPage {
  private readonly api = inject(ClientApiService);
  protected readonly auth = inject(AuthService);

  readonly appointments = signal<Appointment[]>([]);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly toCancel = signal<Appointment | null>(null);

  private readonly now = Date.now();

  /** Active and still to come, the nearest first. */
  readonly upcoming = computed(() =>
    this.appointments()
      .filter((a) => this.isActive(a) && new Date(a.scheduled_at).getTime() > this.now)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
  );

  /** Everything else (done, cancelled, missed), the most recent first, as the API sends it. */
  readonly history = computed(() => this.appointments().filter((a) => !this.upcoming().includes(a)));

  constructor() {
    this.load();
  }

  load(): void {
    this.api.myAppointments().subscribe({
      next: (appointments) => {
        this.appointments.set(appointments);
        this.loaded.set(true);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error));
        this.loaded.set(true);
      },
    });
  }

  isActive(appointment: Appointment): boolean {
    return appointment.status === 'Scheduled' || appointment.status === 'Confirmed';
  }

  cancelled(result: Cancellation): void {
    this.toCancel.set(null);
    this.appointments.update((list) => list.map((a) => (a.id === result.appointment.id ? result.appointment : a)));
    this.notice.set(
      result.deposit_refund_due
        ? $localize`:@@myAppointments.cancelled.refund:Appointment cancelled. Your deposit will be refunded: @nailsbyscooby will contact you on Instagram.`
        : $localize`:@@myAppointments.cancelled:Appointment cancelled. The studio was told.`,
    );
  }
}
