import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { AuthService } from '../../../core/auth/auth.service';
import { PhoneInput } from '../../../shared/phone-input';

type Step = 'details' | 'code';

/**
 * First booking: a client whose Instagram was pre-approved by the studio
 * fills in her details, confirms the code sent by email, and is logged in.
 */
@Component({
  selector: 'app-check-in-page',
  imports: [ReactiveFormsModule, RouterLink, PhoneInput],
  templateUrl: './check-in.page.html',
})
export class CheckInPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    instagram: ['', Validators.required],
    name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
  });
  readonly code = this.fb.control('', [Validators.required, Validators.pattern(/^\d{6}$/)]);

  readonly step = signal<Step>('details');
  readonly sentTo = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  /** Shows the links to log in or create a password, when she already has an account. */
  readonly hasAccount = signal(false);
  readonly notice = signal<string | null>(null);

  sendCode(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.start(() => {
      this.step.set('code');
      this.code.reset();
    });
  }

  resend(): void {
    this.start(() =>
      this.notice.set($localize`:@@checkin.resent:A new code was sent. Check also the spam folder.`),
    );
  }

  verify(): void {
    if (this.code.invalid) {
      this.code.markAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.auth.checkInVerify({ instagram: this.form.controls.instagram.value, code: this.code.value }).subscribe({
      // She came to make her first booking: go straight to it.
      next: () => this.router.navigateByUrl('/book'),
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

  changeDetails(): void {
    this.step.set('details');
    this.error.set(null);
    this.notice.set(null);
  }

  private start(onSent: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.hasAccount.set(false);
    this.auth.checkInStart(this.form.getRawValue()).subscribe({
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
        case 403:
          return $localize`:@@checkin.error.notApproved:This Instagram is not on the list yet. Send a message to @nailsbyscooby on Instagram to book your first appointment.`;
        case 409:
          // Already active, already verified, or the phone/email belongs to another account.
          this.hasAccount.set(true);
          return $localize`:@@checkin.error.registered:You already have an account, or this phone or email is already in use.`;
        case 429:
          return $localize`:@@code.wait:A code was sent a moment ago. Wait a little before asking for a new one.`;
      }
    }
    return apiErrorMessage(error);
  }
}
