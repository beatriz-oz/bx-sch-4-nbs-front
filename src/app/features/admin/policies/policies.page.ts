import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { apiErrorMessage } from '../../../core/api/errors';
import { Policy } from '../../../core/api/types';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';

/**
 * The booking policies. Versions are never edited: a change is a new version,
 * and every appointment keeps the version the client accepted.
 */
@Component({
  selector: 'app-policies-page',
  imports: [FormsModule, StudioDatePipe],
  templateUrl: './policies.page.html',
})
export class PoliciesPage {
  private readonly api = inject(AdminApiService);

  readonly current = signal<Policy | null>(null);
  readonly loaded = signal(false);
  readonly editing = signal(false);
  readonly version = signal('');
  readonly content = signal('');
  readonly publishing = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly canPublish = computed(
    () =>
      this.version().trim().length > 0 &&
      this.content().trim().length > 0 &&
      this.content().trim() !== (this.current()?.content ?? '').trim(),
  );

  constructor() {
    this.api.currentPolicy().subscribe({
      next: (policy) => {
        this.current.set(policy);
        this.loaded.set(true);
      },
      error: (error: unknown) => {
        this.loaded.set(true);
        // 404 just means no policy was published yet.
        if (!(error instanceof HttpErrorResponse && error.status === 404)) {
          this.error.set(apiErrorMessage(error));
        }
      },
    });
  }

  startNewVersion(): void {
    // Starts from the current text, so the manicure only changes what is new.
    this.content.set(this.current()?.content ?? '');
    this.version.set('');
    this.notice.set(null);
    this.editing.set(true);
  }

  publish(): void {
    const question = $localize`:@@policies.publish.question:Publish this version? From now on, clients must accept it to book. Existing appointments keep the version they accepted.`;
    if (!confirm(question)) {
      return;
    }
    this.publishing.set(true);
    this.error.set(null);
    this.api.publishPolicy(this.version().trim(), this.content().trim()).subscribe({
      next: (policy) => {
        this.current.set(policy);
        this.editing.set(false);
        this.publishing.set(false);
        this.notice.set($localize`:@@policies.published:Version ${policy.version}:version: published.`);
      },
      error: (error: unknown) => {
        this.publishing.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }
}
