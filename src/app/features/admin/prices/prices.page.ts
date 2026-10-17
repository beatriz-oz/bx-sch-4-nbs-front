import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';

import { apiErrorMessage } from '../../../core/api/errors';
import { Addon, NailArtLevel, NailSize, PriceList, Service } from '../../../core/api/types';
import { ADDON_LABELS, SERVICE_LABELS } from '../../../shared/labels';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';

const VALID_PRICE = /^\d+([.,]\d{1,2})?$/;

/** "40", "40,5" or "40.50" → "40.50"; anything else is returned as it is (and is invalid). */
function normalize(value: string | undefined): string {
  const text = (value ?? '').trim().replace(',', '.');
  return VALID_PRICE.test(text) ? Number(text).toFixed(2) : text;
}

/**
 * The price table. Every price is a key ("service:Application:M", "art:Level 1",
 * "addon:Broken nail") with its value as text, so all inputs work the same way.
 */
@Component({
  selector: 'app-prices-page',
  imports: [NgTemplateOutlet, StudioDatePipe],
  templateUrl: './prices.page.html',
})
export class PricesPage {
  private readonly api = inject(AdminApiService);

  protected readonly sizes: NailSize[] = ['S', 'M', 'L', 'XL', 'XXL'];
  protected readonly sizedServices: Service[] = ['Application', 'Maintenance'];
  protected readonly artLevels: NailArtLevel[] = ['Level 1', 'Level 2', 'Level 3'];
  protected readonly addons: Addon[] = ['Broken nail', 'Extra charm'];
  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly addonLabels = ADDON_LABELS;

  private readonly original = signal<Record<string, string>>({});
  readonly values = signal<Record<string, string>>({});
  readonly lastUpdate = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly changedKeys = computed(() =>
    Object.keys(this.values()).filter((key) => normalize(this.values()[key]) !== normalize(this.original()[key])),
  );
  readonly invalidKeys = computed(() =>
    this.changedKeys().filter((key) => !VALID_PRICE.test(this.values()[key].trim()) || Number(normalize(this.values()[key])) <= 0),
  );

  constructor() {
    this.load();
  }

  serviceKey(service: Service, size: NailSize | null): string {
    return `service:${service}:${size ?? ''}`;
  }

  artKey(level: NailArtLevel): string {
    return `art:${level}`;
  }

  addonKey(addon: Addon): string {
    return `addon:${addon}`;
  }

  setValue(key: string, value: string): void {
    this.values.update((values) => ({ ...values, [key]: value }));
    this.notice.set(null);
  }

  isChanged(key: string): boolean {
    return this.changedKeys().includes(key);
  }

  isInvalid(key: string): boolean {
    return this.invalidKeys().includes(key);
  }

  discard(): void {
    this.values.set({ ...this.original() });
    this.error.set(null);
  }

  load(): void {
    this.api.prices().subscribe({
      next: (prices) => {
        const values = this.toValues(prices);
        this.original.set(values);
        this.values.set({ ...values });
        const dates = [...prices.services, ...prices.nail_art, ...prices.addons].map((price) => price.updated_at).sort();
        this.lastUpdate.set(dates.at(-1) ?? null);
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }

  save(): void {
    if (this.invalidKeys().length) {
      this.error.set($localize`:@@prices.error.invalid:Check the highlighted prices: use numbers above zero, e.g. 40 or 40.50.`);
      return;
    }
    const changed = this.changedKeys();
    if (!changed.length) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    forkJoin(changed.map((key) => this.request(key, normalize(this.values()[key])))).subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.set($localize`:@@prices.saved:${changed.length}:count: price(s) updated. New estimates use them from now on.`);
        this.load();
      },
      error: (error: unknown) => {
        // Some prices may have been saved before the error: reload to show the real state.
        this.saving.set(false);
        this.error.set(apiErrorMessage(error));
        this.load();
      },
    });
  }

  private request(key: string, amount: string): Observable<unknown> {
    const [kind, name, size] = key.split(':');
    if (kind === 'service') {
      return this.api.updateServicePrice(name as Service, (size || null) as NailSize | null, amount);
    }
    if (kind === 'art') {
      return this.api.updateNailArtPrice(name as NailArtLevel, amount);
    }
    return this.api.updateAddonPrice(name as Addon, amount);
  }

  private toValues(prices: PriceList): Record<string, string> {
    const values: Record<string, string> = {};
    for (const price of prices.services) {
      values[this.serviceKey(price.service, price.nail_size)] = price.amount;
    }
    for (const price of prices.nail_art) {
      values[this.artKey(price.nail_art_level)] = price.amount;
    }
    for (const price of prices.addons) {
      values[this.addonKey(price.addon)] = price.amount;
    }
    return values;
  }
}
