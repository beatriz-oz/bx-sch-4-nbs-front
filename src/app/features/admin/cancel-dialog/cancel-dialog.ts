import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { apiErrorMessage } from '../../../core/api/errors';
import { AdminAppointment } from '../../../core/api/types';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';

/** Cancels an appointment on behalf of the studio. The client gets an email with the optional message. */
@Component({
  selector: 'app-cancel-dialog',
  imports: [FormsModule, StudioDatePipe],
  templateUrl: './cancel-dialog.html',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class CancelDialog {
  private readonly api = inject(AdminApiService);

  readonly appointment = input.required<AdminAppointment>();
  readonly cancelled = output<AdminAppointment>();
  readonly closed = output<void>();

  readonly message = signal('');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    this.submitting.set(true);
    this.error.set(null);
    this.api.cancel(this.appointment().id, this.message().trim() || null).subscribe({
      next: (updated) => this.cancelled.emit(updated),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }
}
