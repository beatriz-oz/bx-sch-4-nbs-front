import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../../core/api/errors';
import { Estimate, NailArtLevel, NailSize, PriceList, PriceSimulation, Service } from '../../../core/api/types';
import { AuthService } from '../../../core/auth/auth.service';
import { ART_LEVEL_HINTS, EXTRA_LABELS, SERVICE_LABELS } from '../../../shared/labels';
import { ClientApiService } from '../../client/client-api.service';

type SimulationState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; estimate: Estimate }
  | { kind: 'error'; message: string };

/**
 * "How much will it cost?" for anyone, without login. The price is always the
 * API's: this page only collects the choices and shows the answer.
 */
@Component({
  selector: 'app-price-simulator-page',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './price-simulator.page.html',
})
export class PriceSimulatorPage {
  private readonly api = inject(ClientApiService);
  protected readonly auth = inject(AuthService);

  protected readonly services: Service[] = ['Application', 'Maintenance', 'Removal'];
  protected readonly sizes: NailSize[] = ['S', 'M', 'L', 'XL', 'XXL'];
  protected readonly artLevels: NailArtLevel[] = ['Level 1', 'Level 2', 'Level 3'];
  protected readonly serviceLabels = SERVICE_LABELS;
  protected readonly artHints = ART_LEVEL_HINTS;

  readonly service = signal<Service | null>(null);
  readonly nailSize = signal<NailSize | null>(null);
  readonly artLevel = signal<NailArtLevel | null>(null);
  readonly brokenNails = signal(0);
  readonly otherProfessional = signal(false);

  readonly prices = toSignal(this.api.prices().pipe(catchError(() => of(null as PriceList | null))), {
    initialValue: null,
  });

  readonly needsDetails = computed(() => this.service() === 'Application' || this.service() === 'Maintenance');

  /** What to ask the API, or null while a choice is still missing. */
  readonly request = computed<PriceSimulation | null>(() => {
    const service = this.service();
    if (service === null) {
      return null;
    }
    if (!this.needsDetails()) {
      return { service };
    }
    const nailSize = this.nailSize();
    const artLevel = this.artLevel();
    if (nailSize === null || artLevel === null) {
      return null;
    }
    return {
      service,
      nail_size: nailSize,
      nail_art_level: artLevel,
      broken_nails: this.brokenNails(),
      has_other_professional_nails: this.otherProfessional(),
    };
  });

  /**
   * Each change asks the API again. switchMap drops the answer of an older question,
   * so a slow reply never overwrites a newer one.
   */
  readonly simulation = toSignal(
    toObservable(this.request).pipe(
      switchMap((request) =>
        request === null
          ? of<SimulationState>({ kind: 'idle' })
          : this.api.simulatePrice(request).pipe(
              map((estimate): SimulationState => ({ kind: 'ready', estimate })),
              startWith<SimulationState>({ kind: 'loading' }),
              catchError((error: unknown) => of<SimulationState>({ kind: 'error', message: apiErrorMessage(error) })),
            ),
      ),
    ),
    { initialValue: { kind: 'idle' } as SimulationState },
  );

  chooseService(service: Service): void {
    this.service.set(service);
    if (service === 'Removal') {
      this.nailSize.set(null);
      this.artLevel.set(null);
      this.brokenNails.set(0);
      this.otherProfessional.set(false);
    }
  }

  // Prices shown next to each option, as in the booking.
  servicePrice(service: Service, size: NailSize | null): string | null {
    return this.prices()?.services.find((p) => p.service === service && p.nail_size === size)?.amount ?? null;
  }

  lowestPrice(service: Service): number | null {
    const amounts = (this.prices()?.services ?? []).filter((p) => p.service === service).map((p) => Number(p.amount));
    return amounts.length ? Math.min(...amounts) : null;
  }

  artPrice(level: NailArtLevel): string | null {
    return this.prices()?.nail_art.find((p) => p.nail_art_level === level)?.amount ?? null;
  }

  extraLabel(description: string): string {
    return EXTRA_LABELS[description] ?? description;
  }
}
