import { CurrencyPipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { ClientProfile } from '../../../core/api/types';
import { CANCELLATION_LABELS, SERVICE_LABELS, STATUS_LABELS } from '../../../shared/labels';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';
import { formatDuration } from '../reports/report-format';

/** One client: her details, totals, whether she may come back, and every appointment. */
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

  instagramUrl(handle: string): string {
    return `https://instagram.com/${handle}`;
  }
}
