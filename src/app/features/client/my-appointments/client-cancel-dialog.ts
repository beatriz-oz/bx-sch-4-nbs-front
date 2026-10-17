import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal } from '@angular/core';

import { apiErrorMessage } from '../../../core/api/errors';
import { Appointment, Cancellation } from '../../../core/api/types';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { ClientApiService } from '../client-api.service';

/**
 * The client cancels her appointment. The 48-hour rule lives only in the API:
 * the first try goes without accepting the deposit loss, and only if the API
 * says it is too late does this dialog ask her to accept it.
 */
@Component({
  selector: 'app-client-cancel-dialog',
  imports: [StudioDatePipe],
  templateUrl: './client-cancel-dialog.html',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class ClientCancelDialog {
  private readonly api = inject(ClientApiService);

  readonly appointment = input.required<Appointment>();
  readonly cancelled = output<Cancellation>();
  readonly closed = output<void>();

  /** True once the API said it is less than 48 hours before: the deposit is lost. */
  readonly late = signal(false);
  readonly acceptLoss = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.cancel(this.appointment().id, this.late() && this.acceptLoss()).subscribe({
      next: (result) => this.cancelled.emit(result),
      error: (error: unknown) => {
        this.busy.set(false);
        const detail = error instanceof HttpErrorResponse ? String(error.error?.detail ?? '') : '';
        if (error instanceof HttpErrorResponse && error.status === 409 && detail.includes('accept_deposit_loss')) {
          this.late.set(true);
          return;
        }
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 409
            ? $localize`:@@myAppointments.cancel.notAllowed:This appointment can no longer be cancelled here. Please contact the studio on Instagram.`
            : apiErrorMessage(error),
        );
      },
    });
  }
}
