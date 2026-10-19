import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

import { apiErrorMessage } from '../../../core/api/errors';
import { AdminAppointment, NailArtLevel } from '../../../core/api/types';
import { SERVICE_LABELS } from '../../../shared/labels';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';

/**
 * Closes a past appointment with the price actually charged.
 * "Recalculate" asks the API for the price of what was really done (nothing is saved);
 * "Complete" saves the final price, which the manicure can still adjust by hand.
 */
@Component({
  selector: 'app-complete-dialog',
  imports: [DecimalPipe, FormsModule, StudioDatePipe],
  templateUrl: './complete-dialog.html',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class CompleteDialog implements OnInit {
  private readonly api = inject(AdminApiService);

  readonly appointment = input.required<AdminAppointment>();
  readonly completed = output<AdminAppointment>();
  readonly closed = output<void>();

  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly artLevels: NailArtLevel[] = ['Level 1', 'Level 2', 'Level 3'];

  readonly nailArtLevel = signal<NailArtLevel | null>(null);
  readonly brokenNails = signal(0);
  readonly extraCharms = signal(0);
  readonly completeRemoval = signal(false);
  readonly finalPrice = signal('');
  /** How long it really took: starts empty on purpose, so it is always the real time. */
  readonly durationHours = signal<number | null>(null);
  readonly durationMinutes = signal<number | null>(null);
  readonly notes = signal('');
  readonly approveClient = signal(false);
  protected readonly minuteSteps = [0, 15, 30, 45];

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    // Inputs are only available from here on, not in the constructor.
    const appointment = this.appointment();
    this.nailArtLevel.set(appointment.nail_art_level);
    this.brokenNails.set(appointment.broken_nails);
    this.completeRemoval.set(appointment.has_other_professional_nails);
    this.finalPrice.set(appointment.estimated_price);
  }

  /** Removal and Other have no details to change: their price is just typed. */
  hasDetails(): boolean {
    const service = this.appointment().service;
    return service === 'Application' || service === 'Maintenance';
  }

  recalculate(): void {
    this.run(
      this.api.estimate(this.appointment().id, {
        nail_art_level: this.nailArtLevel(),
        broken_nails: this.brokenNails(),
        extra_charms: this.extraCharms(),
        complete_removal: this.completeRemoval(),
      }),
      (estimate) => this.finalPrice.set(estimate.price),
    );
  }

  complete(): void {
    const price = this.finalPrice().trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(price)) {
      this.error.set($localize`:@@complete.invalidPrice:Enter a valid price, e.g. 45 or 45.50.`);
      return;
    }
    const hours = this.durationHours();
    const minutes = this.durationMinutes();
    if (hours === null || minutes === null) {
      this.error.set($localize`:@@complete.durationRequired:Fill in how long it took (hours and minutes).`);
      return;
    }
    const duration = Number(hours) * 60 + Number(minutes);
    if (duration < 15 || duration > 600) {
      this.error.set($localize`:@@complete.invalidDuration:The duration must be between 15 minutes and 10 hours.`);
      return;
    }
    this.run(this.api.complete(this.appointment().id, price, duration, this.notes().trim() || null, this.approveClient()), (updated) => this.completed.emit(updated));
  }

  private run<T>(request: Observable<T>, onSuccess: (value: T) => void): void {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: (value) => {
        this.busy.set(false);
        onSuccess(value);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }
}
