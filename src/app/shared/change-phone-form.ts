import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { apiErrorMessage } from '../core/api/errors';
import { AuthService } from '../core/auth/auth.service';
import { PasswordInput } from './password-input';
import { PhoneInput } from './phone-input';

/**
 * Change the phone she logs in with. There is no SMS to confirm it, so the current password
 * is asked instead, and the API sends a notice to her email.
 */
@Component({
  selector: 'app-change-phone-form',
  imports: [ReactiveFormsModule, PasswordInput, PhoneInput],
  templateUrl: './change-phone-form.html',
})
export class ChangePhoneForm {
  private readonly auth = inject(AuthService);

  readonly form = inject(NonNullableFormBuilder).group({
    phone: ['', Validators.required],
    current: ['', Validators.required],
  });

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal(false);

  submit(): void {
    this.done.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.auth.changePhone({ current_password: value.current, new_phone: value.phone }).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(true);
        this.form.reset();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(this.messageFor(error));
      },
    });
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400 && error.error?.detail === 'This is already your phone number.') {
        return $localize`:@@phoneChange.error.same:This is already your phone number.`;
      }
      if (error.status === 400) {
        return $localize`:@@password.error.current:Your current password is not correct.`;
      }
      if (error.status === 409) {
        return $localize`:@@phoneChange.error.taken:This phone number is already used by another account.`;
      }
      if (error.status === 422) {
        return $localize`:@@phoneChange.error.invalid:This phone number is not valid.`;
      }
    }
    return apiErrorMessage(error);
  }
}
