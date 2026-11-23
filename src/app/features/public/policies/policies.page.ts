import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';

import { apiErrorMessage } from '../../../core/api/errors';
import { Policy } from '../../../core/api/types';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { ClientApiService } from '../../client/client-api.service';

/**
 * The current booking policies, to read at any time (not only while booking).
 * Public, like the prices: the same text the client accepts when she books.
 */
@Component({
  selector: 'app-policies-page',
  imports: [StudioDatePipe],
  templateUrl: './policies.page.html',
})
export class PoliciesPage {
  private readonly api = inject(ClientApiService);

  readonly policy = signal<Policy | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.api.currentPolicy().subscribe({
      next: (policy) => {
        this.policy.set(policy);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 404
            ? $localize`:@@clientPolicies.none:The booking policies have not been published yet.`
            : apiErrorMessage(error),
        );
      },
    });
  }
}
