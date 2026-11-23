import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { AuthService } from '../../../core/auth/auth.service';
import { PasswordInput } from '../../../shared/password-input';
import { PhoneInput } from '../../../shared/phone-input';

type Step = 'details' | 'resume' | 'code';

/**
 * First booking: a client whose Instagram was pre-approved by the studio
 * fills in her details, confirms the code sent by email, and is logged in.
 * A regular client the studio already approved (often created from her Instagram only) is then asked
 * whether she wants to book now or only activate her account, i.e. create her password.
 */
@Component({
  selector: 'app-check-in-page',
  imports: [ReactiveFormsModule, RouterLink, PhoneInput, PasswordInput],
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
  /** "Continue the activation": only her Instagram, the code goes to the email she already gave. */
  readonly resumeInstagram = this.fb.control('', Validators.required);
  readonly resuming = signal(false);

  readonly step = signal<Step>('details');
  readonly sentTo = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  /** Shows the links to log in or create a password, when she already has an account. */
  readonly hasAccount = signal(false);
  readonly notice = signal<string | null>(null);

  /** After the code, for an approved client: 'choose' (book or activate), then 'password'. */
  readonly popup = signal<'choose' | 'password' | null>(null);
  readonly passwordForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmation: ['', Validators.required],
  });
  readonly popupError = signal<string | null>(null);

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
    const sent = () => this.notice.set($localize`:@@checkin.resent:A new code was sent. Check also the spam folder.`);
    if (this.resuming()) {
      this.resume(sent);
    } else {
      this.start(sent);
    }
  }

  /** She already checked in but closed the window before creating her password. */
  goResume(): void {
    this.resumeInstagram.setValue(this.form.controls.instagram.value);
    this.error.set(null);
    this.notice.set(null);
    this.hasAccount.set(false);
    this.step.set('resume');
  }

  sendResumeCode(): void {
    if (this.resumeInstagram.invalid) {
      this.resumeInstagram.markAsTouched();
      return;
    }
    this.resume(() => {
      this.step.set('code');
      this.code.reset();
    });
  }

  verify(): void {
    if (this.code.invalid) {
      this.code.markAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const instagram = this.resuming() ? this.resumeInstagram.value : this.form.controls.instagram.value;
    this.auth.checkInVerify({ instagram, code: this.code.value }).subscribe({
      next: (user) => {
        this.busy.set(false);
        // A regular client the studio approved: ask. Anyone else came to book: go straight to it.
        if (user.can_create_password) {
          this.popup.set('choose');
        } else {
          this.router.navigateByUrl('/book');
        }
      },
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

  book(): void {
    this.router.navigateByUrl('/book');
  }

  /** "Only activate my account": she creates her password, then sees her appointments. */
  createPassword(): void {
    const value = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    if (value.password !== value.confirmation) {
      this.popupError.set($localize`:@@activate.error.mismatch:The two passwords are different.`);
      return;
    }
    this.busy.set(true);
    this.popupError.set(null);
    this.auth.activateMe(value.password).subscribe({
      next: () => this.router.navigateByUrl('/appointments'),
      error: (error: unknown) => {
        this.busy.set(false);
        this.popupError.set(apiErrorMessage(error));
      },
    });
  }

  changeDetails(): void {
    this.step.set(this.resuming() ? 'resume' : 'details');
    this.error.set(null);
    this.notice.set(null);
  }

  private resume(onSent: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.auth.checkInResume(this.resumeInstagram.value).subscribe({
      next: (sentTo) => {
        this.busy.set(false);
        this.resuming.set(true);
        this.sentTo.set(sentTo);
        onSent();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 409
            ? $localize`:@@checkin.resume.nothing:There is no activation to continue for this Instagram. If it is your first appointment, fill in the form instead.`
            : this.messageFor(error),
        );
      },
    });
  }

  private start(onSent: () => void): void {
    this.resuming.set(false);
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
