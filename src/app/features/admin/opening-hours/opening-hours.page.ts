import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { apiErrorMessage } from '../../../core/api/errors';
import { AgendaDay, AgendaMonth, ScheduleException } from '../../../core/api/types';
import { studioToday } from '../../../core/dates';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';
import { DayEditor } from './day-editor';

/**
 * Which days and slots clients can book, month by month, and the button
 * that publishes a month (clients only see published months).
 */
@Component({
  selector: 'app-opening-hours-page',
  imports: [StudioDatePipe, DayEditor],
  templateUrl: './opening-hours.page.html',
})
export class OpeningHoursPage {
  private readonly api = inject(AdminApiService);

  protected readonly today = studioToday();
  private readonly todayYear = Number(this.today.slice(0, 4));
  private readonly todayMonth = Number(this.today.slice(5, 7));

  readonly year = signal(this.todayYear);
  readonly month = signal(this.todayMonth);
  readonly agenda = signal<AgendaMonth | null>(null);
  readonly exceptions = signal<ScheduleException[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly publishing = signal(false);
  readonly notifying = signal(false);
  readonly selectedDay = signal<string | null>(null);

  /** First day of the month, as YYYY-MM-DD (for the month title). */
  readonly firstDay = computed(() => `${this.year()}-${String(this.month()).padStart(2, '0')}-01`);
  readonly isPastMonth = computed(() => this.year() * 12 + this.month() < this.todayYear * 12 + this.todayMonth);

  /** Empty cells before the 1st, so it falls under its weekday (weeks start on Monday). */
  readonly leadingBlanks = computed(() => {
    const weekday = new Date(`${this.firstDay()}T12:00:00Z`).getUTCDay();
    return Array.from({ length: (weekday + 6) % 7 });
  });

  readonly selected = computed(() => this.agenda()?.days.find((day) => day.day === this.selectedDay()) ?? null);
  readonly selectedExceptions = computed(() => this.exceptions().filter((e) => e.day === this.selectedDay()));

  constructor() {
    this.load();
  }

  move(direction: -1 | 1): void {
    const index = this.year() * 12 + (this.month() - 1) + direction;
    this.year.set(Math.floor(index / 12));
    this.month.set((index % 12) + 1);
    this.notice.set(null);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin([this.api.agenda(this.year(), this.month()), this.api.exceptions(this.year(), this.month())]).subscribe({
      next: ([agenda, exceptions]) => {
        this.agenda.set(agenda);
        this.exceptions.set(exceptions);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  hasException(day: string): boolean {
    return this.exceptions().some((exception) => exception.day === day);
  }

  lockedReason(day: AgendaDay): string | null {
    if (day.day < this.today) {
      return $localize`:@@hours.locked.past:This day has already passed.`;
    }
    return null;
  }

  /** The "agenda is open" email to the regular clients who want it. */
  notify(): void {
    const again = !!this.agenda()?.notified_at;
    const question = again
      ? $localize`:@@hours.notify.again:The regular clients were already told about this month. Send the email again?`
      : $localize`:@@hours.notify.question:Email the regular clients that this month is open?`;
    if (!confirm(question)) {
      return;
    }
    this.notifying.set(true);
    this.error.set(null);
    this.api.notifyMonth(this.year(), this.month()).subscribe({
      next: (notified) => {
        this.notifying.set(false);
        this.notice.set($localize`:@@hours.notified:Email sent to ${notified.notified_clients}:count: regular client(s).`);
        this.load();
      },
      error: (error: unknown) => {
        this.notifying.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }

  publish(): void {
    const question = $localize`:@@hours.publish.question:Publish this month? Clients will be able to book it. The email to the regular clients is a separate button, for when you choose.`;
    if (!confirm(question)) {
      return;
    }
    this.publishing.set(true);
    this.error.set(null);
    this.api.publishMonth(this.year(), this.month()).subscribe({
      next: (published) => {
        this.publishing.set(false);
        this.notice.set(
          $localize`:@@hours.published:Published: clients can book it now. Tell the regular clients by email whenever you want.`,
        );
        this.load();
      },
      error: (error: unknown) => {
        this.publishing.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }
}
