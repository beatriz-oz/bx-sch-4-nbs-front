import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { apiErrorMessage } from '../../core/api/errors';
import { AdminAppointment } from '../../core/api/types';
import { addDays, startOfWeek, studioDay, studioToday, weekDays } from '../../core/dates';
import { SERVICE_LABELS, STATUS_LABELS } from '../../shared/labels';
import { StudioDatePipe } from '../../shared/studio-date.pipe';
import { AdminApiService } from './admin-api.service';
import { CancelDialog } from './cancel-dialog/cancel-dialog';
import { CompleteDialog } from './complete-dialog/complete-dialog';

/** The manicure's week: every appointment, with its alerts and the actions that fit its moment. */
@Component({
  selector: 'app-admin-home-page',
  imports: [CurrencyPipe, StudioDatePipe, CancelDialog, CompleteDialog],
  templateUrl: './admin-home.page.html',
})
export class AdminHomePage {
  private readonly api = inject(AdminApiService);

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly today = studioToday();

  readonly weekStart = signal(startOfWeek(this.today));
  readonly weekEnd = computed(() => addDays(this.weekStart(), 6));
  readonly appointments = signal<AdminAppointment[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<number | null>(null);

  // The appointment shown in each dialog (null = dialog closed).
  readonly toCancel = signal<AdminAppointment | null>(null);
  readonly toComplete = signal<AdminAppointment | null>(null);

  /** The 7 days of the week, each with its appointments (already sorted by the API). */
  readonly days = computed(() =>
    weekDays(this.weekStart()).map((day) => ({
      day,
      items: this.appointments().filter((appointment) => studioDay(appointment.scheduled_at) === day),
    })),
  );

  readonly overdueCount = computed(() => this.appointments().filter((a) => a.deposit_overdue).length);
  readonly refundCount = computed(() => this.appointments().filter((a) => a.refund_due).length);

  constructor() {
    this.load();
  }

  previousWeek(): void {
    this.weekStart.update((monday) => addDays(monday, -7));
    this.load();
  }

  nextWeek(): void {
    this.weekStart.update((monday) => addDays(monday, 7));
    this.load();
  }

  thisWeek(): void {
    this.weekStart.set(startOfWeek(this.today));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.weekStart(), this.weekEnd()).subscribe({
      next: (appointments) => {
        this.appointments.set(appointments);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  isActive(appointment: AdminAppointment): boolean {
    return appointment.status === 'Scheduled' || appointment.status === 'Confirmed';
  }

  hasStarted(appointment: AdminAppointment): boolean {
    return new Date(appointment.scheduled_at).getTime() <= Date.now();
  }

  /** OTHER never needs a deposit. */
  needsDeposit(appointment: AdminAppointment): boolean {
    return appointment.service !== 'Other' && !appointment.deposit_paid;
  }

  confirmDeposit(appointment: AdminAppointment): void {
    const question = $localize`:@@dashboard.confirmDeposit.question:Confirm that the deposit was paid? The client will get an email.`;
    if (confirm(question)) {
      this.act(appointment, this.api.confirmDeposit(appointment.id));
    }
  }

  markNoShow(appointment: AdminAppointment): void {
    const question = $localize`:@@dashboard.noShow.question:Mark this appointment as a no-show? This cannot be undone.`;
    if (confirm(question)) {
      this.act(appointment, this.api.noShow(appointment.id));
    }
  }

  /** Puts the updated appointment (returned by the API) in place of the old one. */
  replace(updated: AdminAppointment): void {
    this.appointments.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    this.toCancel.set(null);
    this.toComplete.set(null);
  }

  private act(appointment: AdminAppointment, request: ReturnType<AdminApiService['noShow']>): void {
    this.busyId.set(appointment.id);
    this.error.set(null);
    request.subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.replace(updated);
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.error.set(apiErrorMessage(error));
      },
    });
  }
}
