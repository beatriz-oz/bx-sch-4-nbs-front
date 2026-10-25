import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, LOCALE_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { YearReport } from '../../../core/api/types';
import { studioToday } from '../../../core/dates';
import { EXPENSE_CATEGORY_LABELS, SERVICE_LABELS } from '../../../shared/labels';
import { AdminApiService } from '../admin-api.service';
import { MonthBars } from './month-bars';
import { formatDuration } from './report-format';

/** How much the studio worked, earned and spent, month by month. */
@Component({
  selector: 'app-reports-page',
  imports: [CurrencyPipe, MonthBars, RouterLink],
  templateUrl: './reports.page.html',
})
export class ReportsPage {
  private readonly api = inject(AdminApiService);
  private readonly locale = inject(LOCALE_ID);

  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly categoryLabels = EXPENSE_CATEGORY_LABELS;
  protected readonly formatDuration = formatDuration;
  private readonly currentYear = Number(studioToday().slice(0, 4));

  readonly year = signal(this.currentYear);
  readonly month = signal(Number(studioToday().slice(5, 7)));
  readonly report = signal<YearReport | null>(null);
  readonly error = signal<string | null>(null);

  // --- export to a spreadsheet ---
  readonly exportOpen = signal(false);
  readonly exportStart = signal('');
  readonly exportEnd = signal('');
  readonly exporting = signal(false);
  readonly exportError = signal<string | null>(null);

  /** "Jan", "Feb"… in the site's language. */
  readonly monthLabels = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(this.locale, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, index, 15))),
  );
  readonly monthNames = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(this.locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, index, 15))),
  );

  readonly selected = computed(() => this.report()?.months[this.month() - 1] ?? null);
  readonly revenues = computed(() => (this.report()?.months ?? []).map((m) => Number(m.total_revenue)));
  readonly hours = computed(() => (this.report()?.months ?? []).map((m) => m.worked_minutes / 60));

  /** Income from services per hour actually worked (the kept deposits need no work). */
  readonly perHour = computed(() => {
    const month = this.selected();
    return month && month.worked_minutes ? Number(month.services_revenue) / (month.worked_minutes / 60) : null;
  });

  readonly yearTotals = computed(() => {
    const months = this.report()?.months ?? [];
    return {
      completed: months.reduce((sum, m) => sum + m.completed, 0),
      minutes: months.reduce((sum, m) => sum + m.worked_minutes, 0),
      revenue: months.reduce((sum, m) => sum + Number(m.total_revenue), 0),
      expenses: months.reduce((sum, m) => sum + Number(m.expenses), 0),
      profit: months.reduce((sum, m) => sum + Number(m.profit), 0),
    };
  });

  // Axis and tooltip formats for the two charts.
  readonly euros = (value: number): string =>
    new Intl.NumberFormat(this.locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  readonly hoursLabel = (value: number): string => `${Math.round(value * 10) / 10}h`;

  constructor() {
    this.load();
  }

  /** Opens the export box with the month being looked at; the dates can then be changed. */
  openExport(): void {
    const month = String(this.month()).padStart(2, '0');
    const lastDay = new Date(Date.UTC(this.year(), this.month(), 0)).getUTCDate();
    this.exportStart.set(`${this.year()}-${month}-01`);
    this.exportEnd.set(`${this.year()}-${month}-${String(lastDay).padStart(2, '0')}`);
    this.exportError.set(null);
    this.exportOpen.set(true);
  }

  downloadExport(): void {
    const start = this.exportStart();
    const end = this.exportEnd();
    if (!start || !end || end < start) {
      this.exportError.set($localize`:@@export.error.dates:Choose a start date and an end date after it.`);
      return;
    }
    const language = this.locale.startsWith('pt') ? 'pt' : 'en';
    this.exporting.set(true);
    this.exportError.set(null);
    this.api.exportAppointments(start, end, language).subscribe({
      next: (file) => {
        this.exporting.set(false);
        // The file arrives through HttpClient (with the login token), so the browser
        // is asked to save it from memory: a temporary link to the Blob, clicked once.
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = `${language === 'pt' ? 'marcacoes' : 'appointments'}_${start}_${end}.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
        this.exportOpen.set(false);
      },
      error: () => {
        this.exporting.set(false);
        // The error body is a Blob too; the only expected one is a period over 2 years.
        this.exportError.set($localize`:@@export.error.failed:The file could not be created. Choose a period of up to 2 years.`);
      },
    });
  }

  moveYear(direction: -1 | 1): void {
    this.year.update((year) => year + direction);
    this.month.set(direction > 0 ? 1 : 12);
    this.load();
  }

  load(): void {
    this.error.set(null);
    this.api.yearReport(this.year()).subscribe({
      next: (report) => this.report.set(report),
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }
}
