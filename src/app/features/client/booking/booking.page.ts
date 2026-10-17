import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { apiErrorMessage } from '../../../core/api/errors';
import {
  AppointmentDetails,
  AvailableDay,
  Booking,
  Estimate,
  NailArtLevel,
  NailSize,
  Policy,
  PriceList,
  Service,
} from '../../../core/api/types';
import { AuthService } from '../../../core/auth/auth.service';
import { studioToday } from '../../../core/dates';
import { ART_LEVEL_HINTS, EXTRA_LABELS, SERVICE_LABELS } from '../../../shared/labels';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { ClientApiService } from '../client-api.service';

type Step = 'service' | 'time' | 'summary' | 'done';

/**
 * The client books in four steps: service → day and time → summary with the
 * estimate and the policies → done. Each step only asks what it needs.
 */
@Component({
  selector: 'app-booking-page',
  imports: [CurrencyPipe, RouterLink, StudioDatePipe],
  templateUrl: './booking.page.html',
})
export class BookingPage {
  private readonly api = inject(ClientApiService);
  protected readonly auth = inject(AuthService);

  protected readonly services: Service[] = ['Application', 'Maintenance', 'Removal'];
  protected readonly sizes: NailSize[] = ['S', 'M', 'L', 'XL', 'XXL'];
  protected readonly artLevels: NailArtLevel[] = ['Level 1', 'Level 2', 'Level 3'];
  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly artHints = ART_LEVEL_HINTS;
  protected readonly today = studioToday();

  readonly step = signal<Step>('service');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  // --- step 1: the service ---
  readonly service = signal<Service | null>(null);
  readonly nailSize = signal<NailSize | null>(null);
  readonly artLevel = signal<NailArtLevel | null>(null);
  readonly brokenNails = signal(0);
  readonly otherProfessional = signal(false);
  readonly prices = signal<PriceList | null>(null);

  readonly needsDetails = computed(() => this.service() === 'Application' || this.service() === 'Maintenance');
  readonly serviceReady = computed(
    () => this.service() !== null && (!this.needsDetails() || (this.nailSize() !== null && this.artLevel() !== null)),
  );

  // --- step 2: the day and time ---
  private readonly todayYear = Number(this.today.slice(0, 4));
  private readonly todayMonth = Number(this.today.slice(5, 7));
  readonly year = signal(this.todayYear);
  readonly month = signal(this.todayMonth);
  readonly days = signal<AvailableDay[]>([]);
  readonly selectedDay = signal<string | null>(null);
  readonly selectedSlot = signal<string | null>(null);

  readonly firstDay = computed(() => `${this.year()}-${String(this.month()).padStart(2, '0')}-01`);
  readonly canGoBackMonth = computed(() => this.year() * 12 + this.month() > this.todayYear * 12 + this.todayMonth);
  readonly slotsByDay = computed(() => new Map(this.days().map((day) => [day.day, day.slots])));
  readonly selectedDaySlots = computed(() => this.slotsByDay().get(this.selectedDay() ?? '') ?? []);

  /** Every day of the month, with blanks before the 1st so it falls under its weekday. */
  readonly calendar = computed(() => {
    const first = new Date(`${this.firstDay()}T12:00:00Z`);
    const blanks = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(this.year(), this.month(), 0)).getUTCDate();
    const days = Array.from(
      { length: daysInMonth },
      (_, index) => `${this.firstDay().slice(0, 8)}${String(index + 1).padStart(2, '0')}`,
    );
    return { blanks: Array.from({ length: blanks }), days };
  });

  // --- step 3: the summary ---
  readonly estimate = signal<Estimate | null>(null);
  readonly policy = signal<Policy | null>(null);
  readonly accepted = signal(false);
  readonly showPolicy = signal(false);

  /** Maintenance booked more than 35 days after the last appointment is priced as an application. */
  readonly pricedAsApplication = computed(
    () => this.service() === 'Maintenance' && this.estimate()?.service === 'Application',
  );

  // --- step 4: done ---
  readonly booking = signal<Booking | null>(null);

  constructor() {
    this.api.prices().subscribe((prices) => this.prices.set(prices));
  }

  // Prices shown next to each option, so the client knows the cost while choosing.
  servicePrice(service: Service, size: NailSize | null): string | null {
    return this.prices()?.services.find((p) => p.service === service && p.nail_size === size)?.amount ?? null;
  }

  lowestPrice(service: Service): number | null {
    const amounts = (this.prices()?.services ?? []).filter((p) => p.service === service).map((p) => Number(p.amount));
    return amounts.length ? Math.min(...amounts) : null;
  }

  artPrice(level: NailArtLevel): string | null {
    return this.prices()?.nail_art.find((p) => p.nail_art_level === level)?.amount ?? null;
  }

  extraLabel(description: string): string {
    return EXTRA_LABELS[description] ?? description;
  }

  chooseService(service: Service): void {
    this.service.set(service);
    if (service === 'Removal') {
      this.nailSize.set(null);
      this.artLevel.set(null);
      this.brokenNails.set(0);
    }
  }

  chooseSize(size: NailSize): void {
    // XL/XXL have fewer slots: a time picked before may no longer exist.
    if (size !== this.nailSize()) {
      this.selectedSlot.set(null);
    }
    this.nailSize.set(size);
  }

  goToTime(): void {
    this.step.set('time');
    this.error.set(null);
    this.loadMonth(true);
  }

  moveMonth(direction: -1 | 1): void {
    const index = this.year() * 12 + (this.month() - 1) + direction;
    this.year.set(Math.floor(index / 12));
    this.month.set((index % 12) + 1);
    this.selectedDay.set(null);
    this.loadMonth(false);
  }

  /** With `findNext`, skips to the next month when this one has no free slots (e.g. late in the month). */
  loadMonth(findNext: boolean): void {
    this.busy.set(true);
    this.api.availability(this.year(), this.month(), this.nailSize()).subscribe({
      next: (days) => {
        this.busy.set(false);
        this.days.set(days);
        if (!days.length && findNext && this.month() !== (this.todayMonth % 12) + 1) {
          this.moveMonth(1);
        }
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }

  pickDay(day: string): void {
    if (this.slotsByDay().has(day)) {
      this.selectedDay.set(day);
      this.selectedSlot.set(null);
    }
  }

  goToSummary(): void {
    this.step.set('summary');
    this.error.set(null);
    this.accepted.set(false);
    this.estimate.set(null);
    this.busy.set(true);
    forkJoin([this.api.estimate(this.details()), this.api.currentPolicy()]).subscribe({
      next: ([estimate, policy]) => {
        this.busy.set(false);
        this.estimate.set(estimate);
        this.policy.set(policy);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }

  confirm(): void {
    const policy = this.policy();
    if (!policy || !this.accepted()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.book({ ...this.details(), policy_id: policy.id, accept_policies: true }).subscribe({
      next: (booking) => {
        this.busy.set(false);
        this.booking.set(booking);
        this.step.set('done');
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.handleBookingError(error);
      },
    });
  }

  private handleBookingError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      const detail = String(error.error?.detail ?? '');
      if (detail.toLowerCase().includes('polic')) {
        // The studio published new policies while she was booking: show the new text.
        this.accepted.set(false);
        this.api.currentPolicy().subscribe((policy) => this.policy.set(policy));
        this.error.set($localize`:@@book.error.policyChanged:The policies were just updated. Please read them again before confirming.`);
        return;
      }
      // Someone else took the slot a moment ago.
      this.selectedSlot.set(null);
      this.step.set('time');
      this.loadMonth(false);
      this.error.set($localize`:@@book.error.slotTaken:This time was just booked by someone else. Please choose another one.`);
      return;
    }
    this.error.set(apiErrorMessage(error));
  }

  private details(): AppointmentDetails {
    const needsDetails = this.needsDetails();
    return {
      scheduled_at: this.selectedSlot() ?? '',
      service: this.service() ?? 'Application',
      nail_size: needsDetails ? this.nailSize() : null,
      nail_art_level: needsDetails ? this.artLevel() : null,
      broken_nails: needsDetails ? this.brokenNails() : 0,
      has_other_professional_nails: this.otherProfessional(),
    };
  }
}
