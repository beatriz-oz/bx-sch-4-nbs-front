import { CurrencyPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminAppointment } from '../../../core/api/types';
import { formatMinutes, studioMinutes } from '../../../core/dates';
import { SERVICE_LABELS, STATUS_LABELS, TRADE_ITEM_LABELS } from '../../../shared/labels';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';

/** Details of one appointment, in a panel on the right, with the actions that fit its moment. */
@Component({
  selector: 'app-appointment-panel',
  imports: [CurrencyPipe, RouterLink, StudioDatePipe],
  templateUrl: './appointment-panel.html',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class AppointmentPanel {
  readonly appointment = input.required<AdminAppointment>();
  readonly busy = input(false);

  readonly closed = output<void>();
  readonly confirmDeposit = output<void>();
  readonly cancel = output<void>();
  readonly edit = output<void>();
  readonly complete = output<void>();
  readonly noShow = output<void>();

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly tradeItemLabels = TRADE_ITEM_LABELS;

  readonly timeRange = computed(() => {
    const start = studioMinutes(this.appointment().scheduled_at);
    return `${formatMinutes(start)} – ${formatMinutes(start + this.appointment().duration_minutes)}`;
  });

  readonly isActive = computed(() => ['Scheduled', 'Confirmed'].includes(this.appointment().status));
  readonly hasStarted = computed(() => new Date(this.appointment().scheduled_at).getTime() <= Date.now());
  /** Whether it needs a deposit comes from the API (OTHER and press-ons never do). */
  readonly needsDeposit = computed(() => this.appointment().deposit_required && !this.appointment().deposit_paid);
}
