import { CurrencyPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

import { AdminAppointment } from '../../../core/api/types';
import { formatMinutes, studioMinutes } from '../../../core/dates';
import { SERVICE_LABELS, STATUS_LABELS } from '../../../shared/labels';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { SERVICE_DURATION } from '../calendar/calendar-layout';

/** Details of one appointment, in a panel on the right, with the actions that fit its moment. */
@Component({
  selector: 'app-appointment-panel',
  imports: [CurrencyPipe, StudioDatePipe],
  templateUrl: './appointment-panel.html',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class AppointmentPanel {
  readonly appointment = input.required<AdminAppointment>();
  readonly busy = input(false);

  readonly closed = output<void>();
  readonly confirmDeposit = output<void>();
  readonly cancel = output<void>();
  readonly complete = output<void>();
  readonly noShow = output<void>();

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly serviceLabels = SERVICE_LABELS;

  readonly timeRange = computed(() => {
    const start = studioMinutes(this.appointment().scheduled_at);
    return `${formatMinutes(start)} – ${formatMinutes(start + SERVICE_DURATION[this.appointment().service])}`;
  });

  readonly isActive = computed(() => ['Scheduled', 'Confirmed'].includes(this.appointment().status));
  readonly hasStarted = computed(() => new Date(this.appointment().scheduled_at).getTime() <= Date.now());
  /** OTHER never needs a deposit. */
  readonly needsDeposit = computed(() => this.appointment().service !== 'Other' && !this.appointment().deposit_paid);
}
