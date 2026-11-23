import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { apiErrorMessage } from '../../../core/api/errors';
import { ClientOverview } from '../../../core/api/types';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';

type Group = 'registered' | 'pending';

/** Clients shown at a time; the arrows move through the rest. */
const PAGE_SIZE = 4;

/**
 * Every client, in two groups: registered (with a password) and pending
 * (first booking only, or added by the studio, still without a password).
 */
@Component({
  selector: 'app-clients-page',
  imports: [RouterLink, StudioDatePipe],
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

  /** The carousel: which group of 4 is on screen. */
  readonly page = signal(0);
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.visible().length / PAGE_SIZE)));
  readonly shown = computed(() => this.visible().slice(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE));
  /** "7–12 of 20", for the carousel. */
  readonly firstShown = computed(() => (this.visible().length ? this.page() * PAGE_SIZE + 1 : 0));
  readonly lastShown = computed(() => Math.min((this.page() + 1) * PAGE_SIZE, this.visible().length));

  constructor() {
    // A new tab or a new search starts again from the first 4.
    effect(() => {
      this.group();
      this.filter();
      this.page.set(0);
    });

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

  move(step: number): void {
    this.page.update((page) => Math.min(Math.max(page + step, 0), this.pageCount() - 1));
  }

  remove(client: ClientOverview): void {
    const name = `${client.name} ${client.last_name}`.trim();
    const question = $localize`:@@clients.delete.question:Delete ${name}:name:? This cannot be undone.`;
    if (!confirm(question)) {
      return;
    }
    this.error.set(null);
    this.api.deleteClient(client.id).subscribe({
      next: () => {
        this.pending.update((list) => list.filter((item) => item.id !== client.id));
        // Deleting the last one of a page goes back one page.
        this.page.update((page) => Math.min(page, this.pageCount() - 1));
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }

  instagramUrl(handle: string): string {
    return `https://instagram.com/${handle}`;
  }
}
