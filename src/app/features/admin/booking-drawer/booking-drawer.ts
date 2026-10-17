import { Component, computed, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../../core/api/errors';
import {
  AdminAppointment,
  Client,
  NailArtLevel,
  NailSize,
  PriceList,
  Service,
  StudioAppointment,
} from '../../../core/api/types';
import { studioDateTime } from '../../../core/dates';
import { SERVICE_LABELS } from '../../../shared/labels';
import { AdminApiService } from '../admin-api.service';
import { suggestPrice } from './price-suggestion';

type ClientMode = 'existing' | 'new';

/**
 * New appointment booked by the studio: any day and time, an existing client
 * (searched as you type) or a new one, and a price suggested from the table.
 */
@Component({
  selector: 'app-booking-drawer',
  imports: [ReactiveFormsModule],
  templateUrl: './booking-drawer.html',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class BookingDrawer implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly day = input.required<string>();
  readonly time = input.required<string>();
  readonly booked = output<AdminAppointment>();
  readonly closed = output<void>();

  protected readonly services: Service[] = ['Application', 'Maintenance', 'Removal', 'Other'];
  protected readonly sizes: NailSize[] = ['S', 'M', 'L', 'XL', 'XXL'];
  protected readonly artLevels: NailArtLevel[] = ['Level 1', 'Level 2', 'Level 3'];
  protected readonly serviceLabels = SERVICE_LABELS;

  readonly form = this.fb.group({
    day: ['', Validators.required],
    time: ['', Validators.required],
    service: this.fb.control<Service>('Application'),
    nail_size: this.fb.control<NailSize | null>(null),
    nail_art_level: this.fb.control<NailArtLevel | null>(null),
    broken_nails: [0, [Validators.min(0), Validators.max(10)]],
    has_other_professional_nails: [false],
    notes: ['', Validators.maxLength(1000)],
    estimated_price: ['', [Validators.required, Validators.pattern(/^\d+([.,]\d{1,2})?$/)]],
  });

  readonly newClient = this.fb.group({
    name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    instagram: [''],
  });

  readonly clientMode = signal<ClientMode>('existing');
  readonly searchTerm = signal('');
  readonly results = signal<Client[]>([]);
  readonly selectedClient = signal<Client | null>(null);
  readonly searching = signal(false);
  private readonly searches = new Subject<string>();

  private prices: PriceList | null = null;
  /** Once the manicure types a price, the suggestion stops overwriting it. */
  private priceTyped = false;
  readonly suggestion = signal<string | null>(null);

  readonly service = toSignal(this.form.controls.service.valueChanges, { initialValue: 'Application' as Service });
  readonly hasDetails = computed(() => this.service() === 'Application' || this.service() === 'Maintenance');

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly attempted = signal(false);

  ngOnInit(): void {
    // Inputs are only available from here on, not in the constructor.
    this.form.patchValue({ day: this.day(), time: this.time() });

    this.api.prices().subscribe((prices) => {
      this.prices = prices;
      this.updateSuggestion();
    });

    // Search while typing, but only after a short pause, and only the latest answer counts.
    this.searches
      .pipe(
        debounceTime(300),
        switchMap((term) => (term.length < 2 ? of([]) : this.api.searchClients(term).pipe(catchError(() => of([]))))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((clients) => {
        this.results.set(clients);
        this.searching.set(false);
      });

    this.form.controls.service.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((service) => {
      if (service === 'Removal' || service === 'Other') {
        this.form.patchValue({ nail_size: null, nail_art_level: null, broken_nails: 0 }, { emitEvent: false });
      }
    });
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateSuggestion());
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.selectedClient.set(null);
    this.searching.set(term.trim().length >= 2);
    this.searches.next(term.trim());
  }

  selectClient(client: Client): void {
    this.selectedClient.set(client);
    this.results.set([]);
  }

  onPriceTyped(): void {
    this.priceTyped = true;
  }

  useSuggestion(): void {
    const suggestion = this.suggestion();
    if (suggestion) {
      this.form.controls.estimated_price.setValue(suggestion);
      this.priceTyped = false;
    }
  }

  private updateSuggestion(): void {
    if (!this.prices) {
      return;
    }
    const value = this.form.getRawValue();
    const suggestion = suggestPrice(this.prices, {
      service: value.service,
      nailSize: value.nail_size,
      nailArtLevel: value.nail_art_level,
      brokenNails: value.broken_nails,
    });
    this.suggestion.set(suggestion);
    if (suggestion && !this.priceTyped) {
      this.form.controls.estimated_price.setValue(suggestion, { emitEvent: false });
    }
  }

  /** The same rules as the API, checked here first to give a clear message. */
  private problem(): string | null {
    const value = this.form.getRawValue();
    if (this.clientMode() === 'existing' && !this.selectedClient()) {
      return $localize`:@@booking.error.client:Choose a client, or register a new one.`;
    }
    if (this.clientMode() === 'new' && this.newClient.invalid) {
      return $localize`:@@booking.error.newClient:Fill in the new client's name, last name, email and phone.`;
    }
    if (this.hasDetails() && (!value.nail_size || !value.nail_art_level)) {
      return $localize`:@@booking.error.details:Choose the nail size and the nail art level.`;
    }
    if (value.service === 'Other' && !value.notes.trim()) {
      return $localize`:@@booking.error.notes:Describe the service in the notes.`;
    }
    if (this.form.invalid) {
      return $localize`:@@booking.error.form:Check the date, time and price.`;
    }
    return null;
  }

  submit(): void {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    this.newClient.markAllAsTouched();

    const problem = this.problem();
    if (problem) {
      this.error.set(problem);
      return;
    }

    const value = this.form.getRawValue();
    const client = this.newClient.getRawValue();
    const data: StudioAppointment = {
      scheduled_at: studioDateTime(value.day, value.time),
      service: value.service,
      nail_size: this.hasDetails() ? value.nail_size : null,
      nail_art_level: this.hasDetails() ? value.nail_art_level : null,
      broken_nails: this.hasDetails() ? value.broken_nails : 0,
      has_other_professional_nails: value.has_other_professional_nails,
      estimated_price: value.estimated_price.replace(',', '.'),
      notes: value.notes.trim() || null,
      user_id: this.clientMode() === 'existing' ? this.selectedClient()?.id : null,
      new_client:
        this.clientMode() === 'new'
          ? {
              name: client.name,
              last_name: client.last_name,
              email: client.email,
              phone: client.phone,
              instagram: client.instagram.trim() || null,
            }
          : null,
    };

    this.submitting.set(true);
    this.error.set(null);
    this.api.book(data).subscribe({
      next: (appointment) => this.booked.emit(appointment),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }
}
