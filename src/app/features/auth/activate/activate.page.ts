import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { AuthService } from '../../../core/auth/auth.service';

type Step = 'phone' | 'password';

/**
 * Becoming a regular client: after the first booking, the client creates a
 * password. The code goes to the email she gave before, never to a new one.
 */
@Component({
  selector: 'app-activate-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './activate.page.html',
})
export class ActivatePage {
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
  readonly sentTo = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  /** Which way to send her when this is not the right page. */
  readonly redirect = signal<'login' | 'check-in' | null>(null);

  sendCode(): void {
    if (this.phone.invalid) {
      this.phone.markAsTouched();
      return;
    }
    this.start(() => this.step.set('password'));
  }

  resend(): void {
    this.start(() => this.notice.set($localize`:@@checkin.resent:A new code was sent. Check also the spam folder.`));
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
    this.auth.activationConfirm({ phone: this.phone.value, code: value.code, password: value.password }).subscribe({
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

  private start(onSent: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.redirect.set(null);
    this.auth.activationStart(this.phone.value).subscribe({
      next: (sentTo) => {
        this.busy.set(false);
        this.sentTo.set(sentTo);
        onSent();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(this.messageFor(error));
      },
    });
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 404:
          this.redirect.set('check-in');
          return $localize`:@@activate.error.notFound:We don't know this phone number yet. Your first appointment is booked with your Instagram.`;
        case 409:
          this.redirect.set('login');
          return $localize`:@@activate.error.active:Your account already has a password.`;
        case 429:
          return $localize`:@@code.wait:A code was sent a moment ago. Wait a little before asking for a new one.`;
      }
    }
    return apiErrorMessage(error);
  }
}
