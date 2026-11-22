import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { apiErrorMessage } from '../core/api/errors';
import { AuthService } from '../core/auth/auth.service';
import { PasswordInput } from './password-input';

/**
 * Change the email in two steps: the current password and the new email, then the code sent to it.
 * Proving she can read the new email stops a typo from cutting her off from her codes and reminders.
 */
@Component({
  selector: 'app-change-email-form',
  imports: [ReactiveFormsModule, PasswordInput],
  templateUrl: './change-email-form.html',
})
export class ChangeEmailForm {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    current: ['', Validators.required],
  });
  readonly codeForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  /** Where the code went (masked), once step 1 worked. */
  readonly sentTo = signal<string | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal(false);

  start(): void {
    this.done.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.auth.startEmailChange({ current_password: value.current, new_email: value.email.trim() }).subscribe({
      next: (sent) => {
        this.busy.set(false);
        this.sentTo.set(sent.sent_to);
        this.codeForm.reset();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(this.messageFor(error));
      },
    });
  }

  confirm(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.auth.confirmEmailChange(this.codeForm.getRawValue().code).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(true);
        this.sentTo.set(null);
        this.form.reset();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 400
            ? $localize`:@@emailChange.error.code:The code is wrong or has expired. Check it, or ask for a new one.`
            : apiErrorMessage(error),
        );
      },
    });
  }

  /** Back to step 1, e.g. to fix a typo in the new email. */
  restart(): void {
    this.sentTo.set(null);
    this.error.set(null);
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400 && error.error?.detail === 'This is already your email.') {
        return $localize`:@@emailChange.error.same:This is already your email.`;
      }
      if (error.status === 400) {
        return $localize`:@@password.error.current:Your current password is not correct.`;
      }
      if (error.status === 409) {
        return $localize`:@@emailChange.error.taken:This email is already used by another account.`;
      }
      if (error.status === 429) {
        return $localize`:@@emailChange.error.wait:Please wait a minute before asking for a new code.`;
      }
    }
    return apiErrorMessage(error);
  }
}
