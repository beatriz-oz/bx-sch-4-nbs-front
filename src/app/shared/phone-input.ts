import { Component, computed, forwardRef, inject, input, LOCALE_ID, signal } from '@angular/core';
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

/** 'PT' → 🇵🇹 (two "regional indicator" letters that phones draw as a flag). */
function flag(code: string): string {
  return String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

/**
 * A phone number as a country (with its flag and code) plus the number itself.
 * For the form it is a single value in the format the API expects: "+351912345678".
 * Works with formControlName / [formControl] like a normal input (ControlValueAccessor).
 */
@Component({
  selector: 'app-phone-input',
  templateUrl: './phone-input.html',
  host: { class: 'block' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PhoneInput), multi: true }],
})
export class PhoneInput implements ControlValueAccessor {
  /** The id of the number box, for a <label for="..."> outside the component. */
  readonly inputId = input<string | null>(null);

  private readonly names = new Intl.DisplayNames([inject(LOCALE_ID)], { type: 'region' });
  /**
   * Only the flag and the code are shown, so the list goes by code (+1, +31, +32…), with Portugal first.
   * The country's name stays as a tooltip (on Windows the flag shows as two letters).
   */
  protected readonly countries = [...COUNTRIES]
    .sort((a, b) => (a.code === 'PT' ? -1 : b.code === 'PT' ? 1 : Number(a.dial) - Number(b.dial)))
    .map((country) => ({
      ...country,
      label: `${flag(country.code)} +${country.dial}`,
      name: this.names.of(country.code) ?? country.code,
    }));
  protected readonly other = OTHER;

  readonly country = signal('PT');
  readonly number = signal('');
  readonly disabled = signal(false);
  readonly isOther = computed(() => this.country() === OTHER);

  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

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
  }

  chooseCountry(code: string): void {
    this.country.set(code);
    this.emit();
  }

  typeNumber(number: string): void {
    this.number.set(number);
    this.emit();
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
