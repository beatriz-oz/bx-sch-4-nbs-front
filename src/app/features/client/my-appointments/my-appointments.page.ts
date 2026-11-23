import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { Appointment, AppointmentStatus, Cancellation, Service } from '../../../core/api/types';
import { AuthService } from '../../../core/auth/auth.service';
import { SERVICE_LABELS, STATUS_LABELS } from '../../../shared/labels';
import { ClientApiService } from '../client-api.service';
import { AppointmentCard } from './appointment-card';
import { ClientCancelDialog } from './client-cancel-dialog';

/** Appointments shown at a time in the history; the arrows move through the rest. */
const HISTORY_PAGE_SIZE = 4;

/** The client's appointments: the next ones first, then the history (filtered, 4 at a time). */
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

  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly statusLabels = STATUS_LABELS;

  /** The history: filtered by what happened and by service, 4 at a time. */
  readonly historyStatus = signal<AppointmentStatus | 'all'>('all');
  readonly historyService = signal<Service | 'all'>('all');
  readonly historyPage = signal(0);
  /** Only the statuses and services she actually has in her history, for the filters. */
  readonly historyStatuses = computed(() => [...new Set(this.history().map((a) => a.status))]);
  readonly historyServices = computed(() => [...new Set(this.history().map((a) => a.service))]);
  readonly filteredHistory = computed(() =>
    this.history().filter(
      (appointment) =>
        (this.historyStatus() === 'all' || appointment.status === this.historyStatus()) &&
        (this.historyService() === 'all' || appointment.service === this.historyService()),
    ),
  );
  readonly historyPageCount = computed(() => Math.max(1, Math.ceil(this.filteredHistory().length / HISTORY_PAGE_SIZE)));
  readonly shownHistory = computed(() =>
    this.filteredHistory().slice(this.historyPage() * HISTORY_PAGE_SIZE, (this.historyPage() + 1) * HISTORY_PAGE_SIZE),
  );
  readonly historyFirst = computed(() => (this.filteredHistory().length ? this.historyPage() * HISTORY_PAGE_SIZE + 1 : 0));
  readonly historyLast = computed(() =>
    Math.min((this.historyPage() + 1) * HISTORY_PAGE_SIZE, this.filteredHistory().length),
  );

  constructor() {
    this.load();
    // A new filter starts again from the first page.
    effect(() => {
      this.historyStatus();
      this.historyService();
      this.historyPage.set(0);
    });
  }

  moveHistory(step: number): void {
    this.historyPage.update((page) => Math.min(Math.max(page + step, 0), this.historyPageCount() - 1));
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
        : $localize`:@@myAppointments.cancelled:Appointment cancelled. Scooby was told.`,
    );
  }
}
