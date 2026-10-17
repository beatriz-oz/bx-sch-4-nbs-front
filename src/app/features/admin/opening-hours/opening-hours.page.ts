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

  isMonday(day: string): boolean {
    return new Date(`${day}T12:00:00Z`).getUTCDay() === 1;
  }

  hasException(day: string): boolean {
    return this.exceptions().some((exception) => exception.day === day);
  }

  lockedReason(day: AgendaDay): string | null {
    if (this.isMonday(day.day)) {
      return $localize`:@@hours.locked.monday:Mondays are always closed to clients. You can still book a Monday yourself in the calendar.`;
    }
    if (day.day < this.today) {
      return $localize`:@@hours.locked.past:This day has already passed.`;
    }
    return null;
  }

  publish(): void {
    const question = $localize`:@@hours.publish.question:Publish this month? Clients will be able to book it, and the regular clients will get an email.`;
    if (!confirm(question)) {
      return;
    }
    this.publishing.set(true);
    this.error.set(null);
    this.api.publishMonth(this.year(), this.month()).subscribe({
      next: (published) => {
        this.publishing.set(false);
        this.notice.set(
          $localize`:@@hours.published:Published. ${published.notified_clients}:count: regular client(s) notified by email.`,
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
