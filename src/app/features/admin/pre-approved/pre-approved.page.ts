import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { apiErrorMessage } from '../../../core/api/errors';
import { PreApprovedInstagram } from '../../../core/api/types';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';

/**
 * The Instagram handles allowed to book for the first time.
 * A new client uses her @ in the check-in; the manicure adds it here first.
 */
@Component({
  selector: 'app-pre-approved-page',
  imports: [FormsModule, StudioDatePipe],
  templateUrl: './pre-approved.page.html',
})
export class PreApprovedPage {
  private readonly api = inject(AdminApiService);

  readonly entries = signal<PreApprovedInstagram[]>([]);
  readonly handle = signal('');
  readonly filter = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly added = signal<string | null>(null);

  readonly visible = computed(() => {
    const filter = this.filter().trim().replace(/^@/, '').toLowerCase();
    return this.entries().filter((entry) => entry.instagram.includes(filter));
  });

  constructor() {
    this.api.preApproved().subscribe({
      next: (entries) => this.entries.set(entries),
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }

  add(): void {
    const instagram = this.handle().trim();
    if (!instagram) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.added.set(null);
    this.api.addPreApproved(instagram).subscribe({
      next: (entry) => {
        this.entries.update((list) => [entry, ...list]);
        this.handle.set('');
        this.added.set(entry.instagram);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  remove(entry: PreApprovedInstagram): void {
    const question = $localize`:@@preApproved.remove.question:Remove @${entry.instagram}:handle:? She will no longer be able to check in.`;
    if (!confirm(question)) {
      return;
    }
    this.api.removePreApproved(entry.id).subscribe({
      next: () => this.entries.update((list) => list.filter((item) => item.id !== entry.id)),
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }
}
