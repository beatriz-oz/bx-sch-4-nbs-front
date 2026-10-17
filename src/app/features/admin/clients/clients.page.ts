import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { apiErrorMessage } from '../../../core/api/errors';
import { ClientOverview } from '../../../core/api/types';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';

type Group = 'registered' | 'pending';

/**
 * Every client, in two groups: registered (with a password) and pending
 * (first booking only, or added by the studio, still without a password).
 */
@Component({
  selector: 'app-clients-page',
  imports: [StudioDatePipe],
  templateUrl: './clients.page.html',
})
export class ClientsPage {
  private readonly api = inject(AdminApiService);

  readonly group = signal<Group>('registered');
  readonly registered = signal<ClientOverview[]>([]);
  readonly pending = signal<ClientOverview[]>([]);
  readonly filter = signal('');
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  /** The current group, filtered by name, @, email or phone (all already on screen, so no extra request). */
  readonly visible = computed(() => {
    const list = this.group() === 'registered' ? this.registered() : this.pending();
    const term = this.filter().trim().replace(/^@/, '').toLowerCase();
    if (!term) {
      return list;
    }
    return list.filter((client) =>
      [client.name, client.last_name, client.instagram ?? '', client.email, client.phone]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  constructor() {
    // Both groups at once, so each tab can show its count.
    forkJoin([this.api.clientsOverview('registered'), this.api.clientsOverview('pending')]).subscribe({
      next: ([registered, pending]) => {
        this.registered.set(registered);
        this.pending.set(pending);
        this.loaded.set(true);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error));
        this.loaded.set(true);
      },
    });
  }

  instagramUrl(handle: string): string {
    return `https://instagram.com/${handle}`;
  }
}
