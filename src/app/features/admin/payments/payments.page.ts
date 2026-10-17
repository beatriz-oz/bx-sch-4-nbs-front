import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { apiErrorMessage } from '../../../core/api/errors';
import { AdminAppointment, AdminPayments } from '../../../core/api/types';
import { CANCELLATION_LABELS, SERVICE_LABELS } from '../../../shared/labels';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';

type Tab = 'deposits' | 'refunds' | 'cancellations';

/** Money to follow: deposits still to receive, deposits to give back, and recent cancellations. */
@Component({
  selector: 'app-payments-page',
  imports: [CurrencyPipe, StudioDatePipe],
  templateUrl: './payments.page.html',
})
export class PaymentsPage {
  private readonly api = inject(AdminApiService);

  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly reasonLabels = CANCELLATION_LABELS;

  readonly tab = signal<Tab>('deposits');
  readonly payments = signal<AdminPayments | null>(null);
  readonly busyId = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.api.payments().subscribe({
      next: (payments) => this.payments.set(payments),
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }

  confirmDeposit(appointment: AdminAppointment): void {
    const question = $localize`:@@dashboard.confirmDeposit.question:Confirm that the deposit was paid? The client will get an email.`;
    if (confirm(question)) {
      this.run(appointment, this.api.confirmDeposit(appointment.id));
    }
  }

  markRefunded(appointment: AdminAppointment): void {
    const question = $localize`:@@payments.refund.question:Confirm that you gave the deposit back to ${appointment.client.name}:name:?`;
    if (confirm(question)) {
      this.run(appointment, this.api.markRefunded(appointment.id));
    }
  }

  /** After an action the lists change (it leaves one, may enter another): reload them all. */
  private run(appointment: AdminAppointment, request: Observable<AdminAppointment>): void {
    this.busyId.set(appointment.id);
    this.error.set(null);
    request.subscribe({
      next: () => {
        this.busyId.set(null);
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.error.set(apiErrorMessage(error));
      },
    });
  }
}
