import { Component, computed, ElementRef, forwardRef, inject, input, LOCALE_ID, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface Country {
  code: string;
  dial: string;
}

// The countries clients usually come from (Portugal is shown first, the studio is in Porto).
// The writeValue below relies on the US coming before Canada for the shared +1.
const COUNTRIES: Country[] = [
  { code: 'PT', dial: '351' },
  { code: 'BR', dial: '55' },
  { code: 'AO', dial: '244' },
  { code: 'DE', dial: '49' },
  { code: 'AT', dial: '43' },
  { code: 'BE', dial: '32' },
  { code: 'CV', dial: '238' },
  { code: 'ES', dial: '34' },
  { code: 'US', dial: '1' },
  { code: 'CA', dial: '1' },
  { code: 'FR', dial: '33' },
  { code: 'GB', dial: '44' },
  { code: 'IE', dial: '353' },
  { code: 'IT', dial: '39' },
  { code: 'LU', dial: '352' },
  { code: 'MZ', dial: '258' },
  { code: 'NL', dial: '31' },
  { code: 'PL', dial: '48' },
  { code: 'RO', dial: '40' },
  { code: 'CH', dial: '41' },
  { code: 'UA', dial: '380' },
];
/** Any other country: the whole number, with its +code, goes in the text box. */
const OTHER = 'other';

interface Option {
  code: string;
  /** "+351", or "Other country". */
  label: string;
  /** The country's name, shown as a tooltip. */
  name: string;
  /** A drawn flag (public/flags, from flag-icons): emoji flags show as two letters on Windows. */
  flag: string | null;
}

/** Each phone input gets its own ids, so two on the same page never clash. */
let nextId = 0;

/**
 * A phone number as a country (with its flag and code) plus the number itself.
 * For the form it is a single value in the format the API expects: "+351912345678".
 * Works with formControlName / [formControl] like a normal input (ControlValueAccessor).
 *
 * The country picker is a small listbox of its own (not a <select>): the options of a native
 * <select> can only hold text, and the flags are images. It follows the "select-only combobox"
 * pattern: arrows move, Enter chooses, Escape closes, and screen readers hear each option.
 */
@Component({
  selector: 'app-phone-input',
  templateUrl: './phone-input.html',
  host: { class: 'block', '(document:click)': 'onDocumentClick($event)' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PhoneInput), multi: true }],
})
export class PhoneInput implements ControlValueAccessor {
  private readonly host = inject(ElementRef<HTMLElement>);

  /** The id of the number box, for a <label for="..."> outside the component. */
  readonly inputId = input<string | null>(null);

  protected readonly listId = `phone-countries-${nextId++}`;
  private readonly names = new Intl.DisplayNames([inject(LOCALE_ID)], { type: 'region' });

  /** Portugal first, then by code (+1, +31, +32…), and "Other country" at the end. */
  protected readonly options: Option[] = [
    ...[...COUNTRIES]
      .sort((a, b) => (a.code === 'PT' ? -1 : b.code === 'PT' ? 1 : Number(a.dial) - Number(b.dial)))
      .map((country) => ({
        code: country.code,
        label: `+${country.dial}`,
        name: this.names.of(country.code) ?? country.code,
        flag: `flags/${country.code.toLowerCase()}.svg`,
      })),
    { code: OTHER, label: $localize`:@@phone.otherCountry:Other country`, name: '', flag: null },
  ];

  readonly country = signal('PT');
  readonly number = signal('');
  readonly disabled = signal(false);
  readonly isOther = computed(() => this.country() === OTHER);
  readonly selected = computed(() => this.options.find((option) => option.code === this.country()) ?? this.options[0]);

  /** The list of countries: open or not, and which option the arrows are on. */
  readonly open = signal(false);
  readonly activeIndex = signal(0);

  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  optionId(index: number): string {
    return `${this.listId}-${index}`;
  }

  /** From the form to the screen: "+351912345678" → Portugal + "912345678". */
  writeValue(value: string | null): void {
    const phone = (value ?? '').replace(/\s/g, '');
    if (!phone) {
      this.number.set('');
      return;
    }
    // The longest code that matches (+351 before +3...); +1 counts as the first in the list.
    const match = COUNTRIES.filter((country) => phone.startsWith(`+${country.dial}`)).sort(
      (a, b) => b.dial.length - a.dial.length,
    )[0];
    if (match) {
      this.country.set(match.code);
      this.number.set(phone.slice(match.dial.length + 1));
    } else {
      this.country.set(OTHER);
      this.number.set(phone);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
    if (disabled) {
      this.open.set(false);
    }
  }

  chooseCountry(code: string): void {
    this.country.set(code);
    this.emit();
  }

  typeNumber(number: string): void {
    this.number.set(number);
    this.emit();
  }

  // --- the country list ---

  toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.openList();
    }
  }

  /** A click on an option: choose it and give the focus back to the button. */
  choose(code: string, button: HTMLElement): void {
    this.chooseCountry(code);
    this.close();
    button.focus();
  }

  onKeydown(event: KeyboardEvent): void {
    const last = this.options.length - 1;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.open()) {
          this.openList();
          return;
        }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.moveTo(Math.min(last, Math.max(0, this.activeIndex() + step)));
        return;
      }
      case 'Home':
      case 'End':
        if (this.open()) {
          event.preventDefault();
          this.moveTo(event.key === 'Home' ? 0 : last);
        }
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.open()) {
          this.chooseCountry(this.options[this.activeIndex()].code);
          this.close();
        } else {
          this.openList();
        }
        return;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.close();
        }
        return;
      case 'Tab':
        this.close();
        return;
    }
  }

  /** A click anywhere outside this component closes the list. */
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private openList(): void {
    if (this.disabled()) {
      return;
    }
    this.open.set(true);
    this.moveTo(Math.max(0, this.options.findIndex((option) => option.code === this.country())));
  }

  private close(): void {
    if (this.open()) {
      this.open.set(false);
      this.onTouched();
    }
  }

  /** Moves the highlight and keeps that option in view (the list scrolls). */
  private moveTo(index: number): void {
    this.activeIndex.set(index);
    // After Angular has drawn the list.
    setTimeout(() => document.getElementById(this.optionId(index))?.scrollIntoView({ block: 'nearest' }));
  }

  /** From the screen to the form. Empty while there is no number, so Validators.required still works. */
  private emit(): void {
    const number = this.number().trim();
    if (!number) {
      this.onChange('');
      return;
    }
    if (this.isOther()) {
      this.onChange(number.replace(/\s/g, ''));
      return;
    }
    const dial = COUNTRIES.find((country) => country.code === this.country())?.dial ?? '';
    // The API checks the number itself (phonenumbers): here we only join the two parts.
    this.onChange(`+${dial}${number.replace(/[^\d]/g, '')}`);
  }
}
