import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { apiErrorMessage } from '../core/api/errors';
import { AuthService } from '../core/auth/auth.service';

/**
 * Change the password while logged in. The same box for clients (profile) and the studio (My account):
 * the rules live in the API, which answers the same way for both.
 */
@Component({
  selector: 'app-change-password-form',
  imports: [ReactiveFormsModule],
  templateUrl: './change-password-form.html',
})
export class ChangePasswordForm {
  private readonly auth = inject(AuthService);

  readonly form = inject(NonNullableFormBuilder).group({
    current: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmation: ['', Validators.required],
  });

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal(false);

  submit(): void {
    const value = this.form.getRawValue();
    this.done.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (value.password !== value.confirmation) {
      this.error.set($localize`:@@activate.error.mismatch:The two passwords are different.`);
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    this.auth.changePassword({ current_password: value.current, new_password: value.password }).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(true);
        this.form.reset();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(this.messageFor(error, value.current === value.password));
      },
    });
  }

  private messageFor(error: unknown, sameAsCurrent: boolean): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return sameAsCurrent
        ? $localize`:@@password.error.same:The new password must be different from the current one.`
        : $localize`:@@password.error.current:Your current password is not correct.`;
    }
    return apiErrorMessage(error);
  }
}
