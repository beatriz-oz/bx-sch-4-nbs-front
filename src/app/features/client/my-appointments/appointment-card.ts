import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';

import { Appointment } from '../../../core/api/types';
import { SERVICE_LABELS, STATUS_LABELS } from '../../../shared/labels';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';

/** One appointment in the client's list. Upcoming ones show the deposit state and can be cancelled. */
@Component({
  selector: 'app-appointment-card',
  imports: [CurrencyPipe, StudioDatePipe],
  templateUrl: './appointment-card.html',
  // Components are inline elements by default; as a block, the list spacing applies.
  host: { class: 'block' },
})
export class AppointmentCard {
  readonly appointment = input.required<Appointment>();
  readonly upcoming = input(false);
  readonly cancel = output<void>();

  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
}
