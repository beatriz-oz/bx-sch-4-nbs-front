import { Component, computed, DestroyRef, inject, signal } from '@angular/core';

import { apiErrorMessage } from '../../../core/api/errors';
import { AdminAppointment } from '../../../core/api/types';
import {
  addDays,
  formatMinutes,
  startOfWeek,
  studioDay,
  studioMinutes,
  studioToday,
  weekDays,
} from '../../../core/dates';
import { SERVICE_LABELS } from '../../../shared/labels';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';
import { AppointmentPanel } from '../appointment-panel/appointment-panel';
import { BookingDrawer } from '../booking-drawer/booking-drawer';
import { CancelDialog } from '../cancel-dialog/cancel-dialog';
import { CompleteDialog } from '../complete-dialog/complete-dialog';
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_HEIGHT,
  layoutDay,
  minutesAtOffset,
  offsetOfMinutes,
  PlacedAppointment,
} from './calendar-layout';

type View = 'day' | 'week';

/** The manicure's agenda, drawn like Google Calendar. */
@Component({
  selector: 'app-calendar-page',
  imports: [StudioDatePipe, AppointmentPanel, BookingDrawer, CancelDialog, CompleteDialog],
  templateUrl: './calendar.page.html',
})
export class CalendarPage {
  private readonly api = inject(AdminApiService);

  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly hourHeight = HOUR_HEIGHT;
  protected readonly hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
  protected readonly gridHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;
  protected readonly formatMinutes = formatMinutes;

  // On a phone, one day fits better than seven.
  readonly view = signal<View>(window.innerWidth < 768 ? 'day' : 'week');
  readonly selectedDay = signal(studioToday());
  readonly showCancelled = signal(false);
  readonly today = signal(studioToday());
  readonly nowMinutes = signal(studioMinutes(new Date()));

  readonly appointments = signal<AdminAppointment[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  // What is open on top of the calendar (null = closed).
  readonly selected = signal<AdminAppointment | null>(null);
  readonly toCancel = signal<AdminAppointment | null>(null);
  readonly toComplete = signal<AdminAppointment | null>(null);
  readonly newBooking = signal<{ day: string; time: string } | null>(null);

  readonly days = computed(() =>
    this.view() === 'week' ? weekDays(startOfWeek(this.selectedDay())) : [this.selectedDay()],
  );

  /** Each visible day with its blocks already placed on the grid. */
  readonly columns = computed(() => {
    const visible = this.appointments().filter((a) => this.showCancelled() || a.status !== 'Cancelled');
    return this.days().map((day) => ({
      day,
      blocks: layoutDay(visible.filter((a) => studioDay(a.scheduled_at) === day)),
    }));
  });

  readonly nowOffset = computed(() => offsetOfMinutes(this.nowMinutes()));
  readonly overdueCount = computed(() => this.appointments().filter((a) => a.deposit_overdue).length);
  readonly refundCount = computed(() => this.appointments().filter((a) => a.refund_due).length);

  constructor() {
    this.load();
    // Moves the red "now" line every minute.
    const timer = setInterval(() => {
      this.nowMinutes.set(studioMinutes(new Date()));
      this.today.set(studioToday());
    }, 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  setView(view: View): void {
    this.view.set(view);
    this.load();
  }

  move(direction: -1 | 1): void {
    this.selectedDay.update((day) => addDays(day, direction * (this.view() === 'week' ? 7 : 1)));
    this.load();
  }

  goToToday(): void {
    this.selectedDay.set(studioToday());
    this.load();
  }

  /** In the week view, a click on a day header opens that day. */
  openDay(day: string): void {
    this.selectedDay.set(day);
    this.setView('day');
  }

  load(): void {
    const days = this.days();
    this.loading.set(true);
    this.error.set(null);
    this.api.list(days[0], days[days.length - 1]).subscribe({
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

  /** A click on an empty part of a day opens a new booking at that time. */
  onGridClick(day: string, event: MouseEvent): void {
    if (event.target !== event.currentTarget) {
      return; // the click was on an appointment
    }
    this.newBooking.set({ day, time: formatMinutes(minutesAtOffset(event.offsetY)) });
  }

  newBookingNow(): void {
    const time = formatMinutes(Math.max(minutesAtOffset(0), Math.ceil(this.nowMinutes() / 15) * 15));
    this.newBooking.set({ day: this.selectedDay(), time });
  }

  booked(appointment: AdminAppointment): void {
    this.newBooking.set(null);
    this.selectedDay.set(studioDay(appointment.scheduled_at));
    this.load();
  }

  blockClasses(item: PlacedAppointment): string {
    const appointment = item.appointment;
    switch (appointment.status) {
      case 'Confirmed':
        return 'bg-brand-100 border-brand-500 text-brand-900';
      case 'Completed':
        return 'bg-emerald-50 border-emerald-500 text-emerald-900';
      case 'No_show':
        return 'bg-red-50 border-red-400 text-red-800';
      case 'Cancelled':
        return 'bg-gray-100 border-gray-300 text-gray-500 line-through';
      default:
        // Scheduled: waiting for the deposit, except OTHER, which needs none.
        return appointment.service === 'Other'
          ? 'bg-sky-50 border-sky-400 text-sky-900'
          : 'bg-amber-50 border-amber-400 text-amber-900';
    }
  }

  // --- actions (from the side panel) ---

  confirmDeposit(appointment: AdminAppointment): void {
    const question = $localize`:@@dashboard.confirmDeposit.question:Confirm that the deposit was paid? The client will get an email.`;
    if (confirm(question)) {
      this.run(this.api.confirmDeposit(appointment.id));
    }
  }

  markNoShow(appointment: AdminAppointment): void {
    const question = $localize`:@@dashboard.noShow.question:Mark this appointment as a no-show? This cannot be undone.`;
    if (confirm(question)) {
      this.run(this.api.noShow(appointment.id));
    }
  }

  /** Puts the updated appointment (returned by the API) in place of the old one. */
  replace(updated: AdminAppointment): void {
    this.appointments.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    this.selected.set(updated);
    this.toCancel.set(null);
    this.toComplete.set(null);
  }

  private run(request: ReturnType<AdminApiService['noShow']>): void {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.replace(updated);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }
}
