import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { AppointmentStatus, ClientProfile, Service } from '../../../core/api/types';
import { CANCELLATION_LABELS, SERVICE_LABELS, STATUS_LABELS } from '../../../shared/labels';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';
import { formatDuration } from '../reports/report-format';

/** The history filter: by what happened to the appointment. */
type HistoryStatus = 'all' | 'upcoming' | 'Completed' | 'Cancelled' | 'No_show';

const UPCOMING: AppointmentStatus[] = ['Scheduled', 'Confirmed'];

/** Appointments shown at a time in the history; the arrows move through the rest. */
const HISTORY_PAGE_SIZE = 4;

/** One client: her details, the studio's notes, totals, whether she may come back, and every appointment. */
@Component({
  selector: 'app-client-profile-page',
  imports: [CurrencyPipe, RouterLink, StudioDatePipe],
  templateUrl: './client-profile.page.html',
})
export class ClientProfilePage implements OnInit {
  private readonly api = inject(AdminApiService);

  /** From the route (/admin/clients/:id), thanks to withComponentInputBinding. */
  readonly id = input.required<string>();

  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly reasonLabels = CANCELLATION_LABELS;
  protected readonly formatDuration = formatDuration;

  readonly profile = signal<ClientProfile | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  /** The history: filtered by status and service, 4 at a time. */
  readonly historyStatus = signal<HistoryStatus>('all');
  readonly historyService = signal<Service | 'all'>('all');
  readonly historyPage = signal(0);
  /** Only the services she actually had, for the filter. */
  readonly historyServices = computed(() => [...new Set((this.profile()?.appointments ?? []).map((a) => a.service))]);
  readonly filteredHistory = computed(() => {
    const status = this.historyStatus();
    const service = this.historyService();
    return (this.profile()?.appointments ?? []).filter(
      (appointment) =>
        (status === 'all' ||
          (status === 'upcoming' ? UPCOMING.includes(appointment.status) : appointment.status === status)) &&
        (service === 'all' || appointment.service === service),
    );
  });
  readonly historyPageCount = computed(() => Math.max(1, Math.ceil(this.filteredHistory().length / HISTORY_PAGE_SIZE)));
  readonly shownHistory = computed(() =>
    this.filteredHistory().slice(this.historyPage() * HISTORY_PAGE_SIZE, (this.historyPage() + 1) * HISTORY_PAGE_SIZE),
  );
  readonly historyFirst = computed(() => (this.filteredHistory().length ? this.historyPage() * HISTORY_PAGE_SIZE + 1 : 0));
  readonly historyLast = computed(() =>
    Math.min((this.historyPage() + 1) * HISTORY_PAGE_SIZE, this.filteredHistory().length),
  );

  constructor() {
    // A new filter starts again from the first page.
    effect(() => {
      this.historyStatus();
      this.historyService();
      this.historyPage.set(0);
    });
  }

  moveHistory(step: number): void {
    this.historyPage.update((page) => Math.min(Math.max(page + step, 0), this.historyPageCount() - 1));
  }

  /** Her Instagram while fixing it, or null when only showing it. */
  readonly instagramDraft = signal<string | null>(null);

  saveInstagram(): void {
    const profile = this.profile();
    const instagram = (this.instagramDraft() ?? '').trim();
    if (!profile || !instagram) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.setClientInstagram(profile.client.id, instagram).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.instagramDraft.set(null);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  /** The notes text while editing them, or null when only showing them. */
  readonly notesDraft = signal<string | null>(null);
  protected readonly notesMax = 2000;

  ngOnInit(): void {
    this.api.clientProfile(Number(this.id())).subscribe({
      next: (profile) => this.profile.set(profile),
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }

  toggleApproval(): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }
    const approve = !profile.client.approved;
    const question = approve
      ? $localize`:@@profile.approve.question:Allow ${profile.client.name}:name: to create a password and book again?`
      : $localize`:@@profile.revoke.question:Stop allowing ${profile.client.name}:name: to create a password? She will not be able to book again.`;
    if (!confirm(question)) {
      return;
    }
    this.saving.set(true);
    this.api.setApproval(profile.client.id, approve).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  editNotes(): void {
    this.notesDraft.set(this.profile()?.studio_notes ?? '');
  }

  saveNotes(): void {
    const profile = this.profile();
    const draft = this.notesDraft();
    if (!profile || draft === null) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.setClientNotes(profile.client.id, draft).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.notesDraft.set(null);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  instagramUrl(handle: string): string {
    return `https://instagram.com/${handle}`;
  }
}
