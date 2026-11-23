import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { apiErrorMessage } from '../../../core/api/errors';
import { NewPreApprovedInstagram, PreApprovedInstagram } from '../../../core/api/types';
import { PhoneInput } from '../../../shared/phone-input';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';

/**
 * The Instagram handles allowed to book for the first time.
 * A new client uses her @ in the check-in; the manicure adds it here first.
 * For a regular client, the manicure can also create her account here (already approved):
 * she can book for her straight away, and the client only creates a password.
 */
@Component({
  selector: 'app-pre-approved-page',
  imports: [FormsModule, PhoneInput, StudioDatePipe],
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
  readonly addedWithAccount = signal(false);

  /** A regular client: her account is created at once, with these details. */
  readonly regular = signal(false);
  readonly name = signal('');
  readonly lastName = signal('');
  readonly email = signal('');
  readonly phone = signal('');

  readonly visible = computed(() => {
    const filter = this.filter().trim().replace(/^@/, '').toLowerCase();
    return this.entries().filter((entry) => entry.instagram.includes(filter));
  });

  readonly canAdd = computed(() => {
    if (!this.handle().trim()) {
      return false;
    }
    if (!this.regular()) {
      return true;
    }
    // Only the name is needed: she gives her email and phone at her check-in.
    return !!this.name().trim();
  });

  constructor() {
    this.api.preApproved().subscribe({
      next: (entries) => this.entries.set(entries),
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }

  add(): void {
    if (!this.canAdd()) {
      return;
    }
    const data: NewPreApprovedInstagram = {
      instagram: this.handle().trim(),
      client: this.regular()
        ? {
            name: this.name().trim(),
            last_name: this.lastName().trim(),
            email: this.email().trim() || null,
            phone: this.phone() || null,
          }
        : null,
    };
    this.saving.set(true);
    this.error.set(null);
    this.added.set(null);
    this.api.addPreApproved(data).subscribe({
      next: (entry) => {
        this.entries.update((list) => [entry, ...list]);
        this.added.set(entry.instagram);
        this.addedWithAccount.set(!!entry.client_id);
        this.clear();
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  /** The row being fixed, and its new handle while typing. */
  readonly editingId = signal<number | null>(null);
  readonly editHandle = signal('');

  startEdit(entry: PreApprovedInstagram): void {
    this.editingId.set(entry.id);
    this.editHandle.set(entry.instagram);
    this.error.set(null);
  }

  saveEdit(entry: PreApprovedInstagram): void {
    const instagram = this.editHandle().trim();
    if (!instagram) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.renamePreApproved(entry.id, instagram).subscribe({
      next: (updated) => {
        this.entries.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
        this.editingId.set(null);
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

  private clear(): void {
    this.handle.set('');
    this.regular.set(false);
    this.name.set('');
    this.lastName.set('');
    this.email.set('');
    this.phone.set('');
  }
}
