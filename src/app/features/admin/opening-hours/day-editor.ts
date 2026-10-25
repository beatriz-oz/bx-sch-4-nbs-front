import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { forkJoin, Observable, of, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../../core/api/errors';
import { AgendaDay, AgendaSlot, ScheduleException } from '../../../core/api/types';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';

/**
 * Opens or closes one day, or single slots of it, for the clients.
 * Each change is an "exception" to the weekly rule; "Back to default" removes them.
 * The times themselves can also change for one day (e.g. the last slot at 16:00).
 */
@Component({
  selector: 'app-day-editor',
  imports: [StudioDatePipe],
  templateUrl: './day-editor.html',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class DayEditor {
  private readonly api = inject(AdminApiService);

  readonly day = input.required<AgendaDay>();
  readonly exceptions = input.required<ScheduleException[]>();
  /** Why the day cannot be changed (a Monday, or the past), or null if it can. */
  readonly lockedReason = input<string | null>(null);

  readonly changed = output<void>();
  readonly closed = output<void>();

  readonly busy = signal(false);
  readonly warning = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly dayOpen = computed(() => this.day().slots.some((slot) => slot.is_open));
  readonly hasExceptions = computed(() => this.exceptions().length > 0);

  /** The times being edited, as HH:MM. Starts again from the day each time it reloads. */
  readonly draftTimes = linkedSignal(() => this.day().slots.map((slot) => slot.time.slice(0, 5)));
  readonly newTime = signal('');
  readonly timesChanged = computed(
    () => this.draftTimes().join() !== this.day().slots.map((slot) => slot.time.slice(0, 5)).join(),
  );

  addTime(): void {
    const time = this.newTime();
    if (time && !this.draftTimes().includes(time)) {
      this.draftTimes.update((times) => [...times, time].sort());
    }
    this.newTime.set('');
  }

  removeTime(time: string): void {
    this.draftTimes.update((times) => times.filter((t) => t !== time));
  }

  saveTimes(): void {
    this.run(this.api.setDaySlots({ day: this.day().day, slot_times: this.draftTimes() }));
  }

  defaultTimes(): void {
    this.run(this.api.setDaySlots({ day: this.day().day, slot_times: [] }));
  }

  /** The whole day follows one rule: the slot exceptions are removed first. */
  toggleDay(): void {
    const slotExceptions = this.exceptions().filter((exception) => exception.slot_time !== null);
    const removals = slotExceptions.map((exception) => this.api.removeException(exception.id));
    const cleared: Observable<unknown> = removals.length ? forkJoin(removals) : of(null);
    this.run(
      cleared.pipe(
        switchMap(() => this.api.setException({ day: this.day().day, slot_time: null, is_open: !this.dayOpen() })),
      ),
    );
  }

  toggleSlot(slot: AgendaSlot): void {
    this.run(this.api.setException({ day: this.day().day, slot_time: slot.time, is_open: !slot.is_open }));
  }

  resetDay(): void {
    const removals = this.exceptions().map((exception) => this.api.removeException(exception.id));
    this.run(forkJoin(removals).pipe(switchMap(() => of(null))));
  }

  private run(request: Observable<string | null>): void {
    this.busy.set(true);
    this.error.set(null);
    this.warning.set(null);
    request.subscribe({
      next: (warning) => {
        this.busy.set(false);
        this.warning.set(warning);
        this.changed.emit();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(error));
        this.changed.emit();
      },
    });
  }
}
