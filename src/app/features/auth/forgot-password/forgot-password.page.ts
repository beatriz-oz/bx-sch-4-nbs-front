import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { AuthService } from '../../../core/auth/auth.service';
import { PhoneInput } from '../../../shared/phone-input';

type Step = 'phone' | 'password';

/**
 * Forgot the password (clients and the studio): a code goes to the account's email,
 * then she chooses a new password and is logged in.
 * The API gives the same answer for any phone, so the page never says whether the phone exists.
 */
@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, PhoneInput],
  templateUrl: './forgot-password.page.html',
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly phone = this.fb.control('', Validators.required);
  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmation: ['', Validators.required],
  });

  readonly step = signal<Step>('phone');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  sendCode(): void {
    if (this.phone.invalid) {
      this.phone.markAsTouched();
      return;
    }
    this.request(() => this.step.set('password'));
  }

  resend(): void {
    this.request(() => this.notice.set($localize`:@@checkin.resent:A new code was sent. Check also the spam folder.`));
  }

  confirm(): void {
    const value = this.form.getRawValue();
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
    this.notice.set(null);
    this.auth.resetPassword({ phone: this.phone.value, code: value.code, password: value.password }).subscribe({
      next: (user) => this.router.navigateByUrl(this.auth.homeFor(user)),
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 400
            ? $localize`:@@code.invalid:This code is not valid or has expired. Check it, or ask for a new one.`
            : apiErrorMessage(error),
        );
      },
    });
  }

  changePhone(): void {
    this.step.set('phone');
    this.error.set(null);
    this.notice.set(null);
  }

  private request(onSent: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.auth.forgotPassword(this.phone.value).subscribe({
      next: () => {
        this.busy.set(false);
        onSent();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 429
            ? $localize`:@@code.wait:A code was sent a moment ago. Wait a little before asking for a new one.`
            : apiErrorMessage(error),
        );
      },
    });
  }
}
