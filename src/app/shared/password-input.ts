import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * A password field with an eye button: shows what she is typing instead of dots, and hides it again.
 * Used like an <input>: <app-password-input inputId="password" autocomplete="current-password" formControlName="password" />
 */
@Component({
  selector: 'app-password-input',
  templateUrl: './password-input.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PasswordInput), multi: true }],
})
export class PasswordInput implements ControlValueAccessor {
  /** The id of the inner <input>, for a <label for="...">. */
  readonly inputId = input<string | null>(null);
  readonly autocomplete = input('current-password');

  protected readonly showLabel = $localize`:@@password.show:Show password`;
  protected readonly hideLabel = $localize`:@@password.hide:Hide password`;

  readonly value = signal('');
  readonly visible = signal(false);
  readonly disabled = signal(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  toggle(): void {
    this.visible.update((shown) => !shown);
  }

  typed(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }

  blurred(): void {
    this.onTouched();
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
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
}
