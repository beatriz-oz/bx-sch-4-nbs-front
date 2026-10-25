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
} from './calendar-layout';

type View = 'day' | 'week' | 'month';

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
  readonly now = signal(Date.now());

  readonly appointments = signal<AdminAppointment[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  // What is open on top of the calendar (null = closed).
  readonly selected = signal<AdminAppointment | null>(null);
  readonly toCancel = signal<AdminAppointment | null>(null);
  readonly toComplete = signal<AdminAppointment | null>(null);
  readonly toEdit = signal<AdminAppointment | null>(null);
  readonly newBooking = signal<{ day: string; time: string } | null>(null);

  readonly days = computed(() =>
    this.view() === 'week' ? weekDays(startOfWeek(this.selectedDay())) : [this.selectedDay()],
  );

  /** The month view: whole weeks (Monday to Sunday) covering the month of the selected day. */
  readonly monthWeeks = computed(() => {
    const first = `${this.selectedDay().slice(0, 8)}01`;
    const last = addDays(`${addDays(first, 32).slice(0, 8)}01`, -1);
    const weeks: { day: string; inMonth: boolean; appointments: AdminAppointment[] }[][] = [];
    for (let monday = startOfWeek(first); monday <= last; monday = addDays(monday, 7)) {
      weeks.push(
        weekDays(monday).map((day) => ({
          day,
          inMonth: day.slice(0, 7) === first.slice(0, 7),
          appointments: this.visibleAppointments()
            .filter((a) => studioDay(a.scheduled_at) === day)
            .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
        })),
      );
    }
    return weeks;
  });

  /** The first and last day the current view shows (and loads). */
  private readonly range = computed(() => {
    if (this.view() === 'month') {
      const weeks = this.monthWeeks();
      return [weeks[0][0].day, weeks[weeks.length - 1][6].day];
    }
    const days = this.days();
    return [days[0], days[days.length - 1]];
  });

  readonly visibleAppointments = computed(() =>
    this.appointments().filter((a) => this.showCancelled() || a.status !== 'Cancelled'),
  );

  /** Each visible day with its blocks already placed on the grid. */
  readonly columns = computed(() => {
    return this.days().map((day) => ({
      day,
      blocks: layoutDay(this.visibleAppointments().filter((a) => studioDay(a.scheduled_at) === day)),
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
      this.now.set(Date.now());
      this.today.set(studioToday());
    }, 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  setView(view: View): void {
    this.view.set(view);
    this.load();
  }

  move(direction: -1 | 1): void {
    if (this.view() === 'month') {
      // The 1st of the previous or next month.
      const first = `${this.selectedDay().slice(0, 8)}01`;
      this.selectedDay.set(direction > 0 ? `${addDays(first, 32).slice(0, 8)}01` : `${addDays(first, -1).slice(0, 8)}01`);
    } else {
      this.selectedDay.update((day) => addDays(day, direction * (this.view() === 'week' ? 7 : 1)));
    }
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
    const [first, last] = this.range();
    this.loading.set(true);
    this.error.set(null);
    this.api.list(first, last).subscribe({
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

  /** After a change, show the day it is on now (it may have moved to another week). */
  changed(appointment: AdminAppointment): void {
    this.toEdit.set(null);
    this.selected.set(appointment);
    this.selectedDay.set(studioDay(appointment.scheduled_at));
    this.load();
  }

  booked(appointment: AdminAppointment): void {
    this.newBooking.set(null);
    this.selectedDay.set(studioDay(appointment.scheduled_at));
    this.load();
  }

  /**
   * The colour of an appointment: green = deposit paid (or no deposit needed),
   * yellow = waiting for the deposit, gray = already happened, faded = cancelled.
   */
  toneClasses(appointment: AdminAppointment): string {
    if (appointment.status === 'Cancelled') {
      return 'bg-gray-50 border-gray-300 text-gray-400 line-through';
    }
    if (new Date(appointment.scheduled_at).getTime() < this.now()) {
      return 'bg-gray-100 border-gray-400 text-gray-600';
    }
    if (appointment.deposit_paid || appointment.service === 'Other') {
      return 'bg-emerald-50 border-emerald-500 text-emerald-900';
    }
    return 'bg-amber-50 border-amber-400 text-amber-900';
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
